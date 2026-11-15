# portfolio

Web 制作の営業用ポートフォリオサイト。素の HTML / CSS / JavaScript のみで構成し、
ビルドツール・パッケージマネージャは使わない。

- 公開 URL: https://kendoyasa-tech.github.io/portfolio/
- リポジトリ: kendoyasa-tech/portfolio（public）
- デプロイ: GitHub Pages。`main` に push した時点で自動公開される（ビルド工程なし）

## 構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 全セクション（HOME / ABOUT / 医療機関の方へ / SKILL / SERVICE / WORKS / FLOW / CONTACT）を1ファイルに収めたメインページ |
| `style.css` | 全スタイル。レスポンシブはメディアクエリで対応 |
| `works/` | 制作実績のスクリーンショット（`work-<案件名>.jpg`） |
| `works/dental/` | 実績として公開している架空の歯科医院サイト（`index.html` / `style.css`）。本体とは独立したCSSで、医療系の制作物として実物を閲覧できるようにしている |
| `service/` | サービス欄のイメージ画像（`svc-<サービス名>.jpg`）。実績欄と絵が被らないページを選ぶ |
| `scripts/asaken-daily.mjs` | asaken（X @ninjacode482651）用の毎日のサービス紹介。毎日 夜20時ごろ（1日1回）、Claude の定期タスクが `.github/workflows/asaken-daily.yml` を起動（slot=evening。GitHub の定時実行は数時間遅れるため使わない。同じ枠の二重投稿は3時間以内なら止める）。紹介文を1つ選び、その日の姫辯の試合結果・殊勲選手・監督の言葉を添えて(280字を超える日はハッシュタグ→監督の言葉の順に削る)、X API で URL なしの文を自動投稿（Secret `ASAKEN_X_API_KEY` / `ASAKEN_X_API_SECRET` / `ASAKEN_X_ACCESS_TOKEN` / `ASAKEN_X_ACCESS_TOKEN_SECRET`、従量課金・自動チャージなし）し、結果を Discord にも送る（`ASAKEN_DISCORD_WEBHOOK_URL`、未登録なら `DISCORD_WEBHOOK_URL`）。文章は `data/asaken-posts.json` に足すだけで、トップの SERVICE 欄「今日のおすすめ」も同じファイルと同じ選び方で表示する。SERVICE 欄を変えたらここの文章も合わせる。キーの確認は workflow_dispatch の `check_x` |
| `works/kiben/` | 姫辯学園の試合シミュレーター。`data/season.json` は毎朝6時ごろ、Claude の定期タスクが起動する GitHub Actions（`.github/workflows/kiben-daily.yml` → `scripts/kiben-daily.mjs`）が自動更新するので手で編集しない。物語は兵庫大会1回戦→甲子園優勝の13試合で姫辯は必ず勝ち、優勝の翌日から翌年（第N回大会）へ。試合は1日1回まで。トップのバナーにも最新の見出しが出る。Discord 投稿先は Secret `DISCORD_WEBHOOK_URL`。X へは無料で出すため、Discord に「Xに投稿する」リンク（文章入りの投稿画面を開く intent リンク）を送り、本人がタップして投稿する。X API での完全自動投稿は有料（投稿ごとに課金）なので使っていない（コードはあり、Secret `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` を登録したときだけ動く） |
| `photo.jpg` | プロフィール写真（`photo/` は元データの保管用） |
| `linkinbio.html` / `linkinbio.css` | Instagram プロフィール用のリンク集ページ |
| `*.svg` / `instagram-profile-export.html` | Instagram 投稿画像の素材と書き出し用ページ。サイト本体からは参照されない |

## 決めごと

- 依存パッケージを追加しない。CDN も使わず、必要なものは自前で書く。
- ナビゲーションのハンバーガーメニューと制作実績のアコーディオン、SKILL のスライダーは `index.html` 末尾のインライン `<script>` で処理する。JS ファイルは分けない。
- SKILL は 768px 以下でのみ横スワイプのスライダーに切り替わる（CSS の `scroll-snap` ＋ JS で生成したドット）。スキルを増減してもドットは自動で追従するため、`.skill-item` を足すだけでよい。
- 制作実績を追加するときは `works/` に画像を置き、`index.html` の `.works-grid` にカードを1つ増やす。カード内には種別バッジ（`.work-tag`）と詳細アコーディオン（`.work-toggle` + `.work-detail`）をセットで入れる。`aria-controls` と詳細側の `id` は他と重複しない値にする。
- 掲載内容は実態と一致させる。自主制作のものを実案件のように見せない。
- 留年の経験や医療系学生へのメッセージはポートフォリオには載せない（Discord などで発信する方針）。
- 画像は掲載前に必ずサムネイル用のサイズへ縮小する（横 900px / JPEG 品質 88 程度）。フルページのスクリーンショットをそのまま置かない。
- 表示確認はブラウザで `index.html` を直接開けばよい（サーバー不要）。
- 動画の実績は、相手（コラボ相手・依頼者）の掲載許可が取れたものだけ、動画本体を公開してよい。許可がないもの（例：田峰家記念ムービー）は静止画カードのみで、動画もリンクも置かない
- 動画を載せるときは `works/` に軽量な mp4（目安 数MB以内）と縦長のポスター画像を置き、該当カードの詳細アコーディオン先頭に `<video class="work-video" … controls playsinline preload="none">` で埋め込む。カードのサムネイルは従来どおり静止画（リール動画は `works/work-reel.jpg`）を使う
- 阪神グルメショーのリール動画は、コラボ相手のさがはるさんの許可を得て掲載している（`works/reel-hanshin.mp4`）

## 案件対応時のツール使い分け

ココナラなどで受けた案件は、Claude のアプリ（claude.ai）と VS Code の Claude を次のように使い分けている。VS Code 側は主に「コードを書く・直す」担当。

| 段階 | 使う方 |
| --- | --- |
| 問い合わせ・見積りの返信 | アプリ |
| ヒアリング・構成案づくり | アプリ |
| 制作（コーディング） | VS Code |
| 修正対応 | 文章の直しはアプリで案を作り、反映は VS Code |
| 納品の連絡・報告 | アプリ |

- リール動画・記念ムービー: 構成案やテロップ文言、ナノバナナ / Google Flow の指示はアプリで作り、編集は CapCut。
- サイト修正・ホームページ制作・LP: ヒアリングや構成・文章はアプリで決め、コーディングは VS Code。
- アプリで決めた構成や文章は会話が共有されないため、コピペで渡される。渡された内容をそのまま正として実装する前に、上の「決めごと」と矛盾しないか確認する。
- お客さんのパスワードやサーバー情報は、どちらにも貼らない。受け取ってもファイルやコミットに残さない。
