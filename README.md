# 運命の相棒ガチャ — Identity Fantasy Gacha

**MVP v1（静的Webサイト）**。YuriDesktopとは無関係の独立プロジェクトです。

## 実装内容

- 15生物系統を厳密な等確率で抽選（各 1/15）
- 合計300種（系統ごと20種）から、選ばれた系統内を等確率で抽選
- レアリティ★1～★6は生物種と独立した等確率抽選
- 生物の体格・生息様式で適合候補を絞った構図・背景抽選（前段の系統抽選に影響しない）
- カメラ・カラーパレット抽選、プロンプト生成（1000文字以内を目標）
- 128bit CSPRNG seed / SHA-256 domain-separated deterministic draws / rejection sampling
- `?v=1&s=<128bit hex>` で再現（ページを再読込しても同結果）
- iPhone対応ページ、プロンプトコピー、ChatGPTへの導線、Xシェア、再現URLコピー
- 写真のアップロードなし、バックエンドなし、外部JS・追跡なし

## ローカル実行

`file://` で開くと `fetch` が制限されます。必ずローカルWebサーバーを使ってください。

```sh
cd identity-fantasy-gacha
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開く。`localhost` は安全なコンテキストとして扱われます。

## テスト

```sh
node --test tests/engine.test.mjs
```

大量試行のカテゴリ分布・seed再現・バイアス判定・適合構図・プロンプト整合を検査します。ブラウザ統合テストは `tests/browser_smoke.py` を参照。

## 公開（Cloudflare Pages：本番）

- **本番公開URL：** https://identity-fantasy-gacha.pages.dev/
- Cloudflare Pages Git連携：`main` / Framework preset `None` / Build command 空欄 / Output directory `.`
- `main` へcommitするとCloudflare Pagesが自動再デプロイする。
- GitHub Pages は旧配信先のため停止予定。本番用URLとして案内しない。
- OGPとcanonicalはCloudflare PagesのURLを使用する。Xクローラーのカード確認は別途実施。
- iPhone Safariで抽選・コピー・アプリ優先起動は実機確認済み。Cloudflare側への移行後は再確認する。

Xへの投稿は投稿画面を開くまでで自動投稿はしません。ChatGPTへの画像送信も利用者の手動操作です。

## 長期再現の重要な制約

- `engine.mjs` の `ALGORITHM_ID` とdraw順序、`data/v1/` の配列順序は**固定**。既存v1を変更すると過去の共有seedが違う結果になる可能性があります。
- 次の生物データ改訂では**v2ディレクトリとv2エンジンを新設**し、既存のv1共有URLを新サイトでも読み込めるようルーティングを追加する必要があります。現在のMVPはv1のみ対応です。
- 完全独立抽選なので同じ結果が続くことがあります。抽選器に履歴補正はありません。
- 生成先ChatGPTの画像遵守・Identity維持・星の描画・写真の扱いは当サイトが制御するものではありません。
- プロンプトは画像生成リクエスト内容を指示するもので、写真自体をこのWebページに送ることはありません。
- 本データは初期ラインアップです。生物名・モチーフの生物学的妥当性は今後校閲の余地があります。

## ファイル構造

- `index.html`, `style.css`: 静的UI
- `app.js`: ブラウザの入出力・共有処理
- `engine.mjs`: 確定的抽選エンジンとプロンプト生成
- `data/v1/`: **版固定**のカタログ・構図・背景・色彩・テンプレート
- `assets/`: OGP画像・ファビコン
- `tests/`: Node.js／ブラウザの検証

## プライバシー・外部リンク

サイトは顔写真・ユーザーアカウント・トークンを要求しません。`fetch` は同一オリジンのローカルJSONとテキストのみ。サイト管理者のアクセスログ、GitHub Pagesのインフラ処理、外部サービスへ移動した後の取扱いは別です。X/ChatGPTを開いた後は各サービスの利用規約とプライバシーポリシーが適用されます。

## UI展示版（2026-10-19）

- ユーザー提供の5枚を軽量WebPに変換し、`assets/examples/` に配置。
- PC向けの左右展示、モバイル向け横スクロール式の生成見本を追加。
- トップの紋章・光・生成イメージへ移動する導線を強化。
- 抽選データ/抽選エンジン・seed URLの仕様は変更しない。

## 公開URLのブランド化（2026-10-19）

Cloudflare Pagesへの初回デプロイに成功。正式な公開URLは https://identity-fantasy-gacha.pages.dev/。GitHubリポジトリはソース管理専用として維持する。GitHub Pagesの旧配信は停止予定。公開GitHubリポジトリに個人ユーザー名が残る点に注意する。
