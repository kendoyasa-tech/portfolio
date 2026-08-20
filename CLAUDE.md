# portfolio

Web 制作の営業用ポートフォリオサイト。素の HTML / CSS / JavaScript のみで構成し、
ビルドツール・パッケージマネージャは使わない。

- 公開 URL: https://kendoyasa-tech.github.io/portfolio/
- リポジトリ: kendoyasa-tech/portfolio（public）
- デプロイ: GitHub Pages。`main` に push した時点で自動公開される（ビルド工程なし）

## 構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 全セクション（HOME / ABOUT / SKILL / SERVICE / WORKS / FLOW / CONTACT）を1ファイルに収めたメインページ |
| `style.css` | 全スタイル。レスポンシブはメディアクエリで対応 |
| `works/` | 制作実績のスクリーンショット（`work-<案件名>.jpg`） |
| `service/` | サービス欄のイメージ画像（`svc-<サービス名>.jpg`）。実績欄と絵が被らないページを選ぶ |
| `photo.jpg` | プロフィール写真（`photo/` は元データの保管用） |
| `linkinbio.html` / `linkinbio.css` | Instagram プロフィール用のリンク集ページ |
| `*.svg` / `instagram-profile-export.html` | Instagram 投稿画像の素材と書き出し用ページ。サイト本体からは参照されない |

## 決めごと

- 依存パッケージを追加しない。CDN も使わず、必要なものは自前で書く。
- ナビゲーションのハンバーガーメニューと制作実績のアコーディオンは `index.html` 末尾のインライン `<script>` で処理する。JS ファイルは分けない。
- 制作実績を追加するときは `works/` に画像を置き、`index.html` の `.works-grid` にカードを1つ増やす。カード内には種別バッジ（`.work-tag`）と詳細アコーディオン（`.work-toggle` + `.work-detail`）をセットで入れる。`aria-controls` と詳細側の `id` は他と重複しない値にする。
- 掲載内容は実態と一致させる。自主制作のものを実案件のように見せない。
- 画像は掲載前に必ずサムネイル用のサイズへ縮小する（横 900px / JPEG 品質 88 程度）。フルページのスクリーンショットをそのまま置かない。
- 表示確認はブラウザで `index.html` を直接開けばよい（サーバー不要）。
