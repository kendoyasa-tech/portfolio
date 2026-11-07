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

// 文章を足すときは、この配列に1つ増やすだけでよい(X の上限に収まるかは --all で確認)
const POSTS = [
  // リール動画制作
  "📱リール・ショート動画の編集、承っています。\nテーマ決めや冒頭の見せ方の相談から、カット・テロップ・BGMまで。\n素材がそろっていない段階からでも大丈夫です。",
  "インスタグラマー・YouTuberの方へ。\n縦型(9:16)のリール・ショート動画を、企画から一緒に作ります。\n継続でお任せいただくご依頼も歓迎です📱",
  "撮った素材がたまっているけど編集する時間がない…という方へ。\nカット編集・テンポ調整・テロップ入れまでお任せください🎬",
  "AI動画生成(Google Flow)を使った演出映像も作れます。\n実写だけでは撮れないシーンを、リールの冒頭やつなぎに入れられます✨",
  // ホームページ制作
  "🏠ホームページ制作(WordPress)\nヒアリング→構成→Figmaで完成イメージ→構築まで一貫して対応します。\nスマホ表示・お問い合わせフォームも込みです。",
  "お店や個人のホームページ、まだ持っていない方へ。\n5〜8ページほどのサイト一式を作ります。\n公開後の更新方法もお伝えするので、ご自身で書き換えられます。",
  // LP
  "📄ランディングページ(LP)制作\n集客・販売に絞った1ページ完結のページを作ります。\n外部ライブラリを使わず、表示の速さにもこだわっています。",
  "予約やお申し込みにつなげたいページ、ありませんか?\n訴求内容の整理から構成案、HTML・CSSのコーディングまで対応します。\n既存サイトへの設置もOKです。",
  // 保守・運用
  "🔧サイトの保守・運用サポート\n文章や画像の差し替え、WordPressの更新、表示崩れの修正など。\n月額でも、必要なときだけのスポット対応でも承ります。",
  "「前の制作会社と連絡がつかない」「更新の仕方が分からない」\n他社さんが作ったサイトでもご相談ください。まず中身を確認してお返事します。",
  // LINE Bot・業務効率化
  "🤖LINE Bot・業務効率化ツールを作っています。\n毎日の記録や集計など「手間がかかっている作業」を、仕組みで減らすお手伝いです。",
  "病院で臨床工学技士として働いているので、医療・介護の現場の話も通じます。\n専門的な業務でも、内容を理解したうえでツールを設計できます🏥",
  // 動画編集
  "🎬記念ムービー・PR動画の編集\n周年行事や式典のムービー、お店や事業の紹介動画を作ります。\n写真と映像をお預かりして、構成から仕上げまで対応します。",
  "動画は掲載先に合わせたサイズで書き出します。\nInstagramリール、YouTube、会場での上映用など、使う場所を教えてください📹",
  // 全体
  "ポートフォリオでは、どこまでお任せいただけるかを具体的に書いています。\nご予算に合わせて一部だけのご依頼もOKです。お気軽にどうぞ🙌",
];

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
  const day = Math.floor((Date.now() + 9 * 3600e3) / 86400e3); // 日本時間の通し日数
  const cycle = Math.floor(day / POSTS.length);
  return build(POSTS[shuffled(POSTS.length, cycle + 1)[day % POSTS.length]]);
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
