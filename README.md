# セイクリッドモンスターズ バトルカード（Sacred Monsters Battle Card）

**セイクリッドモンスターズ**（Sacred Monsters）シリーズのスマートフォン向け 2D カードゲームです（旧名称：ミルティル・ミストリア）。
日本語・英語に対応（設定で切り替え）。

> 開発版。街 → 家でデッキ確認 → ショップでパック → ダンジョン B1〜B3 ボス → 大会 → 報酬 の最小縦断体験を遊べます。
> カード・ルール・価格・提供割合・大会・マップなどは **仮** です（正式仕様ではありません）。

## はじめかた

```bash
npm ci
npm run dev    # 表示された Network の URL を同じ Wi-Fi のスマホで開く
```

公開URL：https://shunyamita0804-source.github.io/sacred-monsters-battle-card/ （リポジトリ改名後）

URL の末尾に `?qa=1` を付けると QA 用のボタン（バトルのオート・即勝利、所持金追加など）が出ます。
詳しくは [docs/setup.md](docs/setup.md) を参照してください。

## ドキュメント

- [夜間作業（2026-10-22）報告](docs/nightbatch-2026-10-22-report.md)
- [設計（画面・ロジック・セーブの構成）](docs/architecture.md)
- [名称変更（→ セイクリッドモンスターズ）の移行](docs/rename-migration.md)
- [日本語・英語の切り替え（i18n）](docs/i18n.md)
- [カードデータ・素材の決まり](docs/card-data-policy.md)
- [開発環境セットアップ](docs/setup.md)
- [GitHub Pages 公開](docs/github-pages.md)
- [素材の置き方](assets/README.md)
- [開発段階](docs/roadmap.md)
- [第1段階 完了報告](docs/phase-1-report.md) / [第2段階 完了報告](docs/phase-2-report.md)
- [Claude Code 向け作業ルール](CLAUDE.md)

## 独立プロジェクトについて

本リポジトリは育成ゲーム本編「ミスティックモンスターズ」（mystic-monsters）とは独立したプロジェクトです。
本編リポジトリの変更・ファイルのコピー・ソースの流用は行っていません。
