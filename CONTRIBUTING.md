# コントリビューション

Issue・プルリクエストを歓迎します。

## 開発の流れ

1. リポジトリをフォークし、ブランチを切って変更してください。
2. 変更後に次を通ることを確認してください。

   ```bash
   npm run lint
   npm run build
   ```

3. `src/`、`index.html`、`vite.config.ts`、`server/` などビルド成果物に影響する編集をした場合は、**必ず `npm run build` を実行**し、`drum-machine/` 出力がエラーなく更新されることを確認してください（ローカル検証用。成果物フォルダは `.gitignore` 対象です）。

4. GitHub で `lint` / `build` を自動化するには、[docs/github-actions-ci.yml](docs/github-actions-ci.yml) を `.github/workflows/ci.yml` として追加してください（トークンに `workflow` スコープが必要な場合があります）。

## コーディング

- 既存のスタイル（命名、インポート、コンポーネントの書き方）に合わせてください。
- 無関係なリファクタやドキュメントの追加は、依頼や Issue で合意がある場合に限ります。

## ライセンス

寄稿いただいた変更は [MIT License](LICENSE) の下で提供されるものとみなします。
