# ドラムマシン（drum-machine）

ブラウザだけで動くドラム・シーケンサーです。パターン編集、プレビュー再生、WAV の書き出しまでクライアント側で完結します。

## ライセンス

- **本リポジトリのソースコードおよび付属ドキュメント**は [**MIT License**](LICENSE) です。
- **アプリから書き出した WAV ファイル**については、アプリ内の案内どおり [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/deed.ja)（パブリックドメイン寄与）として扱う想定です。MIT と CC0 は対象が異なります。

## 必要環境

- [Node.js](https://nodejs.org/) 20 以上推奨（CI は 22 で検証）

## 使い方

```bash
npm ci
npm run dev
```

開発サーバー起動後、表示された URL をブラウザで開きます。

## npm スクリプト

| コマンド | 内容 |
|----------|------|
| `npm run dev` | Vite 開発サーバー |
| `npm run build` | TypeScript チェック + 本番ビルド（出力は `drum-machine/`） |
| `npm run preview` | ビルド結果のプレビュー |
| `npm run lint` | ESLint |
| `npm run start` | 静的ファイル用の簡易サーバー（`server/static-server.mjs`） |

## 本番ビルドと配置

`vite.config.ts` では `base` を本番用に `/drum-machine/` に固定しています。`npm run build` の成果物はリポジトリ直下の **`drum-machine/`** ディレクトリです（`.gitignore` により Git には含めていません。デプロイ先でビルドするか、必要に応じて成果物だけ配布してください）。

ルート直下にホストする場合は `vite.config.ts` の `base` と `PRODUCTION_BASE` を変更してください。

レンタルサーバーへの配置手順の例は [DEPLOY.txt](DEPLOY.txt) にまとめています。

## 設定の保存（Cookie）

- 表示テーマ: `dm-theme`
- 音圧: `dm-volume`

## 技術スタック

React 19、TypeScript、Vite 5、Tailwind CSS 4

## コントリビューション

[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## GitHub Actions（任意）

[docs/github-actions-ci.yml](docs/github-actions-ci.yml) を `.github/workflows/ci.yml` にリネーム／コピーすると、push と pull request で `npm run lint` と `npm run build` が実行されます。

初回だけ GitHub へワークフローファイルを push するとき、認証トークンに **`workflow` スコープ**が必要な場合があります。GitHub CLI では次で付与できます。

```bash
gh auth refresh -s workflow
```

