// 姫辯学園琴丘 毎朝の自動試合
// 1日1試合ずつ夏の大会を進め、結果を works/kiben/data/season.json に保存して Discord と X に投稿する。
// 負けた翌日、または優勝した翌日からは新しい大会(第N回目の挑戦)が始まる。
//
// 使い方:
//   node scripts/kiben-daily.mjs            … 試合をして保存し、DISCORD_WEBHOOK_URL があれば Discord、
//                                             X_API_KEY などX用の4つがあれば X にも投稿
//   node scripts/kiben-daily.mjs --dry-run  … 試合結果を表示するだけ(保存・投稿しない)
//   node scripts/kiben-daily.mjs --repost   … 試合をせず、最新の試合を投稿し直す(--discord-only / --x-only で投稿先を絞れる)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";
import { createHmac, randomBytes } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SIM = join(root, "works/kiben/sim.js");
const DATA = join(root, "works/kiben/data/season.json");
const PAGE_URL = "https://kendoyasa-tech.github.io/portfolio/works/kiben/";
const KEEP_GAMES = 60; // ページに残す試合数
const dryRun = process.argv.includes("--dry-run");
const repost = process.argv.includes("--repost"); // 試合をせず、最新の試合を投稿し直す(投稿テスト用)
const toDiscord = !process.argv.includes("--x-only");
const toX = !process.argv.includes("--discord-only");

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

async function post(text) {
  const hook = process.env.DISCORD_WEBHOOK_URL;
  if (!hook) {
    console.log("DISCORD_WEBHOOK_URL が未設定のため、Discord への投稿は省略しました。");
    return;
  }
  const res = await fetch(hook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "姫辯スポーツ", content: text, allowed_mentions: { parse: [] } }),
  });
  if (!res.ok) {
    console.error(`Discord への投稿に失敗しました: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  console.log("Discord に投稿しました。");
}

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


// ---- X(旧Twitter)への投稿 ----
// X API v2 の POST /2/tweets を OAuth 1.0a(ユーザー認証)で呼ぶ。依存パッケージを増やさないよう署名は自前で作る。
// X の投稿が失敗しても、試合結果の保存と Discord 投稿は止めない(警告だけ出す)。
const pct = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());

function oauthHeader(method, url, keys, nonce = randomBytes(16).toString("hex"), timestamp = Math.floor(Date.now() / 1000).toString()) {
  const params = {
    oauth_consumer_key: keys.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: keys.accessToken,
    oauth_version: "1.0",
  };
  const u = new URL(url);
  const all = { ...params };
  u.searchParams.forEach((v, k) => { all[k] = v; });
  const paramStr = Object.keys(all).sort().map(k => `${pct(k)}=${pct(all[k])}`).join("&");
  const base = [method.toUpperCase(), pct(u.origin + u.pathname), pct(paramStr)].join("&");
  const signingKey = `${pct(keys.apiSecret)}&${pct(keys.accessSecret)}`;
  params.oauth_signature = createHmac("sha1", signingKey).update(base).digest("base64");
  return "OAuth " + Object.keys(params).sort().map(k => `${pct(k)}="${pct(params[k])}"`).join(", ");
}

async function postX(text) {
  const keys = {
    apiKey: process.env.X_API_KEY,
    apiSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  };
  if (Object.values(keys).some(v => !v)) {
    console.log("X用のキー(X_API_KEY など4つ)が未設定のため、X への投稿は省略しました。");
    return;
  }
  const url = "https://api.x.com/2/tweets";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: oauthHeader("POST", url, keys), "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      console.log(`::warning::X への投稿に失敗しました: ${res.status} ${await res.text()}`);
      return;
    }
    const json = await res.json();
    console.log(`X に投稿しました: https://x.com/i/web/status/${json.data?.id}`);
  } catch (e) {
    console.log(`::warning::X への投稿に失敗しました: ${e.message}`);
  }
}

// X は全角1文字を2、URLを23として数え、合計280まで
function xLength(text) {
  const urls = text.match(/https?:\/\/\S+/g) || [];
  let rest = text;
  urls.forEach(u => { rest = rest.replace(u, ""); });
  return urls.length * 23 + [...rest].reduce((n, c) => {
    const cp = c.codePointAt(0);
    return n + ((cp <= 0x10ff) || (cp >= 0x2000 && cp <= 0x200d) || (cp >= 0x2010 && cp <= 0x201f) || (cp >= 0x2032 && cp <= 0x2037) ? 1 : 2);
  }, 0);
}

function xMessage(r) {
  const mark = r.won ? "○" : "●";
  const extra = (r.innings >= 10 ? `延長${r.innings}回` : "") + (r.walkoff ? "サヨナラ" : "");
  let next;
  if (r.champion) next = "🏆 姫辯学園琴丘、甲子園初優勝!甲子園に校歌が響く——";
  else if (!r.won) next = `夏は${r.stage}で幕。明朝から新しい挑戦へ。`;
  else next = `▶ 次戦 明朝6時 vs ${K.TOURNAMENT[r.round + 1]}`;
  const tail = ["#甲子園 #高校野球 #姫辯学園", PAGE_URL + "#daily"].join("\n");
  const build = headline => [
    `📰姫辯スポーツ(架空) ${r.date.slice(5).replace("-", "/")}朝刊`,
    `【${r.stage}】`,
    `${mark} 姫辯学園琴丘 ${r.kibenRuns}-${r.oppRuns} ${r.opponent}${extra ? `(${extra})` : ""}`,
    headline,
    next,
    tail,
  ].filter(Boolean).join("\n");
  let headline = r.headline;
  while (headline && xLength(build(headline)) > 280) headline = [...headline].slice(0, -2).join("") + "…";
  if (xLength(build(headline)) > 280) headline = "";
  return build(headline);
}

async function postAll(r) {
  if (toDiscord) await post(discordMessage(r));
  if (toX) await postX(xMessage(r));
}

if (repost) {
  const prev = state.games[state.games.length - 1];
  if (!prev) { console.log("まだ試合がありません。"); process.exit(0); }
  await postAll(prev);
  process.exit(0);
}

const message = discordMessage(record);

if (dryRun) {
  console.log(message);
  const xm = xMessage(record);
  console.log(`\n---- X 用(${xLength(xm)}/280)----\n${xm}`);
  process.exit(0);
}

state.games.push(record);
state.games = state.games.slice(-KEEP_GAMES);
if (champion) state.titles += 1;
state.updated = new Date().toISOString();
writeFileSync(DATA, JSON.stringify(state, null, 2) + "\n");
console.log(`保存しました: ${record.date} ${record.stage} ${record.kibenRuns}-${record.oppRuns} ${record.opponent}`);

await postAll(record);
