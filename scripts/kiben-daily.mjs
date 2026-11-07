// 姫辯学園琴丘 毎朝の自動試合
// 1日1試合ずつ夏の大会を進め、結果を works/kiben/data/season.json に保存して Discord に投稿する。
// 負けた翌日、または優勝した翌日からは新しい大会(第N回目の挑戦)が始まる。
//
// 使い方:
//   node scripts/kiben-daily.mjs            … 試合をして保存し、DISCORD_WEBHOOK_URL があれば投稿
//   node scripts/kiben-daily.mjs --dry-run  … 試合結果を表示するだけ(保存・投稿しない)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SIM = join(root, "works/kiben/sim.js");
const DATA = join(root, "works/kiben/data/season.json");
const PAGE_URL = "https://kendoyasa-tech.github.io/portfolio/works/kiben/";
const KEEP_GAMES = 60; // ページに残す試合数
const dryRun = process.argv.includes("--dry-run");

// ブラウザ用の sim.js をそのまま読み込む
const ctx = { console, Math };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(readFileSync(SIM, "utf8"), ctx);
const K = ctx.Kiben;

const jstDate = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

const state = existsSync(DATA)
  ? JSON.parse(readFileSync(DATA, "utf8"))
  : { challenge: 0, round: 0, titles: 0, games: [] };

// 前の試合で大会が終わっていたら、新しい挑戦を始める
const last = state.games[state.games.length - 1];
if (!last || !last.won || last.round === K.TOURNAMENT.length - 1) {
  state.challenge += 1;
  state.round = 0;
} else {
  state.round = last.round + 1;
}

const opponent = K.TOURNAMENT[state.round];
const g = K.playGame(opponent, false);
const a = K.article(g);
const champion = g.won && state.round === K.TOURNAMENT.length - 1;

const record = {
  date: jstDate(),
  challenge: state.challenge,
  round: state.round,
  stage: g.stage,
  stadium: g.stadium,
  opponent: g.opponent,
  kibenFirst: g.kibenFirst,
  line: g.line,
  hits: g.hits,
  innings: g.innings,
  kibenRuns: g.kibenRuns,
  oppRuns: g.oppRuns,
  won: g.won,
  walkoff: g.walkoff,
  champion,
  mvp: g.mvp[0],
  headline: a.headline,
  paras: a.paras,
  comments: a.comments,
};

// ---- Discord 用の文章 ----
function boardText(r) {
  const short = name => K.SHORT_NAMES[name] || name;
  const rows = r.kibenFirst
    ? [[short(K.TEAM), "kiben", r.kibenRuns], [short(r.opponent), "opp", r.oppRuns]]
    : [[short(r.opponent), "opp", r.oppRuns], [short(K.TEAM), "kiben", r.kibenRuns]];
  const pad = (s, n) => {
    const w = [...String(s)].reduce((x, c) => x + (c.charCodeAt(0) > 255 ? 2 : 1), 0);
    return String(s) + " ".repeat(Math.max(0, n - w));
  };
  const head = pad("", 10) + Array.from({ length: r.innings }, (_, i) => pad(i + 1, 3)).join("") + " 計 安";
  const lines = rows.map(([label, key, total]) =>
    pad(label, 10) + Array.from({ length: r.innings }, (_, i) => pad(r.line[key][i] ?? "", 3)).join("") +
    " " + pad(total, 3) + r.hits[key]);
  return [head, ...lines].join("\n");
}

function discordMessage(r) {
  const mark = r.won ? "○" : "●";
  const parts = [
    `📰 **姫辯スポーツ** ${r.date.replace(/-/g, "/")}朝刊 ── 挑戦${r.challenge}回目・${r.stage}`,
    `## ${r.headline}`,
    `${mark} 姫辯学園琴丘 **${r.kibenRuns} - ${r.oppRuns}** ${r.opponent}(${r.stadium}${r.innings >= 10 ? `・延長${r.innings}回` : ""})`,
    "```\n" + boardText(r) + "\n```",
    ...r.paras,
    r.comments.map(c => `> ${c}`).join("\n"),
  ];
  if (r.champion) parts.push("🏆 **姫辯学園琴丘、甲子園初優勝!** 甲子園に校歌が響く——");
  else if (!r.won) parts.push(`夏は${r.stage}で幕。明日の朝から新しい挑戦が始まります。`);
  else parts.push(`▶ 次戦は明日の朝6時:${K.OPPONENTS[K.TOURNAMENT[r.round + 1]][2]} vs ${K.TOURNAMENT[r.round + 1]}`);
  parts.push(`過去の試合: <${PAGE_URL}#daily>`);
  let text = parts.join("\n\n");
  if (text.length > 1950) text = text.slice(0, 1950) + "…";
  return text;
}

const message = discordMessage(record);

if (dryRun) {
  console.log(message);
  process.exit(0);
}

state.games.push(record);
state.games = state.games.slice(-KEEP_GAMES);
if (champion) state.titles += 1;
state.updated = new Date().toISOString();
writeFileSync(DATA, JSON.stringify(state, null, 2) + "\n");
console.log(`保存しました: ${record.date} ${record.stage} ${record.kibenRuns}-${record.oppRuns} ${record.opponent}`);

const hook = process.env.DISCORD_WEBHOOK_URL;
if (!hook) {
  console.log("DISCORD_WEBHOOK_URL が未設定のため、Discord への投稿は省略しました。");
} else {
  const res = await fetch(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "姫辯スポーツ", content: message, allowed_mentions: { parse: [] } }),
  });
  if (!res.ok) {
    console.error(`Discord への投稿に失敗しました: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  console.log("Discord に投稿しました。");
}
