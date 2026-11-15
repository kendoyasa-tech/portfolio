// asaken(@ninjacode482651)用 毎日のサービス紹介
// ポートフォリオの SERVICE 欄から、紹介文を1つ選んで Discord に送る。
// X へは無料で出すため、文章入りの投稿画面を開くリンクを一緒に送り、本人がタップして投稿する。
// 全部の文章を一巡するまで同じものは出さない(一巡ごとに並び順をシャッフル。保存ファイルは不要)。
//
// 使い方:
//   node scripts/asaken-daily.mjs            … 今日の1件を選び、ASAKEN_DISCORD_WEBHOOK_URL があれば投稿
//   node scripts/asaken-daily.mjs --dry-run  … 今日の1件を表示するだけ
//   node scripts/asaken-daily.mjs --all      … 全部の文章と文字数を表示する(確認用)

const SITE = "https://kendoyasa-tech.github.io/portfolio/#service";
const TAGS = "#フリーランス #動画編集 #Web制作";

// 文章は data/asaken-posts.json にまとめてある(ポートフォリオの「今日のおすすめ」欄も同じファイルを使う)。
// 文章を足すときは、そのファイルの posts に1つ増やすだけでよい(X の上限に収まるかは --all で確認)
import { readFileSync } from "node:fs";
const POSTS = JSON.parse(readFileSync(new URL("../data/asaken-posts.json", import.meta.url), "utf8")).posts;

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

const build = body => `${body}\n\n${TAGS}\n${SITE}`;

// 一巡ごとに並びを変える(巡目の番号から決まるので、毎回同じ結果になる)
function shuffled(n, seed) {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = seed * 2654435761 % 4294967296 || 1;
  const rand = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function todaysPost() {
  const jst = Date.now() + 9 * 3600e3;
  const day = Math.floor(jst / 86400e3); // 日本時間の通し日数
  // 1日2回(朝=0、昼=1)。SLOT が指定されていなければ日本時間9時より前を朝とみなす
  const slot = process.env.SLOT === "noon" ? 1 : process.env.SLOT === "morning" ? 0 : (new Date(jst).getUTCHours() < 9 ? 0 : 1);
  const n = day * 2 + slot; // 通し番号
  const cycle = Math.floor(n / POSTS.length);
  return build(POSTS[shuffled(POSTS.length, cycle + 1)[n % POSTS.length]]);
}

if (process.argv.includes("--all")) {
  POSTS.forEach((p, i) => {
    const t = build(p);
    console.log(`---- ${i + 1}(${xLength(t)}/280)${xLength(t) > 280 ? " ※長すぎ" : ""} ----\n${t}\n`);
  });
  process.exit(0);
}

const text = todaysPost();
const intent = "https://x.com/intent/post?text=" + encodeURIComponent(text);
const message = `📣 **今日のasaken投稿**\n\n${text.replace(SITE, `<${SITE}>`)}\n\n📲 [Xに投稿する(タップすると文章入りの投稿画面が開きます)](<${intent}>)`;

if (process.argv.includes("--dry-run")) {
  console.log(message);
  console.log(`\n(Xの文字数 ${xLength(text)}/280、Discordの文字数 ${message.length}/2000)`);
  process.exit(0);
}

const hook = process.env.ASAKEN_DISCORD_WEBHOOK_URL;
if (!hook) {
  console.log("ASAKEN_DISCORD_WEBHOOK_URL が未設定のため、Discord への投稿は省略しました。");
  process.exit(0);
}
const res = await fetch(hook, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "asaken投稿", content: message, allowed_mentions: { parse: [] } }),
});
if (!res.ok) {
  console.error(`Discord への投稿に失敗しました: ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log("Discord に投稿しました。");
