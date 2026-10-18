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

## 公開（GitHub Pages：推奨）

1. GitHub リポジトリ `okuyama5279-ai/identity-fantasy-gacha` の `main` ルートに配置済み。
2. GitHub の **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)** を選択。
3. 公開URL `https://okuyama5279-ai.github.io/identity-fantasy-gacha/` で動作を確認。
4. `index.html` の OGP絶対HTTPS URL設定済み。Xのクローラーでカードが表示されるかは公開後に確認。
5. Xアプリ内ブラウザ、Safariで「抽選 → コピー → ChatGPT移動 → URL復元」を実機確認。

GitHub PagesはHTTPSを提供します。Xへの投稿は投稿画面を開くまでで、自動投稿はしません。ChatGPTの画像生成もユーザーの手動操作です。

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
