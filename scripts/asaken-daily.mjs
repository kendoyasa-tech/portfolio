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
  // 1日1回(夜18時)。日本時間の日付ごとに1つ選ぶ
  const n = day; // 通し番号
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
// X に自動で出す文章は URL なし(URL付きは X API の料金が約13倍のため)。サイトはプロフィール欄に置く
const xText = text.replace(`\n${SITE}`, "");

// ---- X への自動投稿(ASAKEN_X_* の4つが登録されているときだけ) ----
import { createHmac, randomBytes } from "node:crypto";
const pct = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
function oauthHeader(method, url, k) {
  const params = {
    oauth_consumer_key: k.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: k.accessToken,
    oauth_version: "1.0",
  };
  const paramStr = Object.keys(params).sort().map(x => `${pct(x)}=${pct(params[x])}`).join("&");
  const base = [method, pct(url), pct(paramStr)].join("&");
  params.oauth_signature = createHmac("sha1", `${pct(k.apiSecret)}&${pct(k.accessSecret)}`).update(base).digest("base64");
  return "OAuth " + Object.keys(params).sort().map(x => `${pct(x)}="${pct(params[x])}"`).join(", ");
}
const xKeys = {
  apiKey: process.env.ASAKEN_X_API_KEY,
  apiSecret: process.env.ASAKEN_X_API_SECRET,
  accessToken: process.env.ASAKEN_X_ACCESS_TOKEN,
  accessSecret: process.env.ASAKEN_X_ACCESS_TOKEN_SECRET,
};
const xReady = Object.values(xKeys).every(Boolean);

// 診断用:キーの中身は出さず、長さと形だけ表示して /2/users/me で認証を確かめる
if (process.argv.includes("--check-x")) {
  for (const [k, v] of Object.entries(xKeys)) {
    const t = v || "";
    console.log(`${k}: 長さ${t.length} 前後の空白${t !== t.trim() ? "あり" : "なし"} ハイフン${t.includes("-") ? "あり" : "なし"} 先頭が数字${/^\d/.test(t) ? "はい" : "いいえ"}`);
  }
  if (xReady) {
    const url = "https://api.x.com/2/users/me";
    const res = await fetch(url, { headers: { Authorization: oauthHeader("GET", url, xKeys) } });
    console.log(`users/me: ${res.status} ${(await res.text()).replace(/\s+/g, " ").slice(0, 200)}`);
  }
  process.exit(0);
}

async function postX() {
  const url = "https://api.x.com/2/tweets";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: oauthHeader("POST", url, xKeys), "Content-Type": "application/json" },
      body: JSON.stringify({ text: xText }),
    });
    if (!res.ok) return { ok: false, err: `${res.status} ${(await res.text()).slice(0, 300)}` };
    const json = await res.json();
    return { ok: true, link: `https://x.com/i/web/status/${json.data?.id}` };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

const intent = "https://x.com/intent/post?text=" + encodeURIComponent(text);
const tapLine = `📲 [Xに投稿する(タップすると文章入りの投稿画面が開きます)](<${intent}>)`;
let xLine = tapLine;

if (process.argv.includes("--dry-run")) {
  console.log(`📣 **今日のasaken投稿**\n\n${text}\n\n(X自動投稿: ${xReady ? "あり" : "なし"})\n--- Xに出す文 ---\n${xText}`);
  console.log(`\n(Xの文字数 ${xLength(xText)}/280)`);
  process.exit(0);
}

if (xReady) {
  const r = await postX();
  if (r.ok) {
    console.log(`X に投稿しました: ${r.link}`);
    xLine = `✅ Xに自動で投稿しました → <${r.link}>`;
  } else {
    console.log(`::warning::X への投稿に失敗しました: ${r.err}`);
    xLine = `⚠️ Xへの自動投稿に失敗しました(${r.err.slice(0, 120)})。今日はこちらから手動でどうぞ\n${tapLine}`;
  }
} else {
  console.log("X用のキー(ASAKEN_X_* の4つ)が未登録のため、X への自動投稿は省略しました。");
}
const message = `📣 **今日のasaken投稿**\n\n${text.replace(SITE, `<${SITE}>`)}\n\n${xLine}`;

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
