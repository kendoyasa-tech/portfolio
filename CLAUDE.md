# portfolio

Web 制作の営業用ポートフォリオサイト。素の HTML / CSS / JavaScript のみで構成し、
ビルドツール・パッケージマネージャは使わない。

- 公開 URL: https://kendoyasa-tech.github.io/portfolio/
- リポジトリ: kendoyasa-tech/portfolio（public）
- デプロイ: GitHub Pages。`main` に push した時点で自動公開される（ビルド工程なし）

## 構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 全セクション（HOME / ABOUT / SERVICE / WORKS / FLOW / CONTACT）を1ファイルに収めたメインページ |
| `style.css` | 全スタイル。レスポンシブはメディアクエリで対応 |
| `works/` | 制作実績のスクリーンショット（`work-<案件名>.png`） |
| `photo.jpg` | プロフィール写真（`photo/` は元データの保管用） |
| `linkinbio.html` / `linkinbio.css` | Instagram プロフィール用のリンク集ページ |
| `*.svg` / `instagram-profile-export.html` | Instagram 投稿画像の素材と書き出し用ページ。サイト本体からは参照されない |

## 決めごと

- 依存パッケージを追加しない。CDN も使わず、必要なものは自前で書く。
- ナビゲーションのハンバーガーメニューは `index.html` 末尾のインライン `<script>` で処理する。JS ファイルは分けない。
- 制作実績を追加するときは `works/` に画像を置き、`index.html` の `.works-grid` にカードを1つ増やす。
- 表示確認はブラウザで `index.html` を直接開けばよい（サーバー不要）。
