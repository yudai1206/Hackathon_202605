# Furuhashi Lab Medium NotebookLM Sources

古橋研究室のMediumブログ記事を、NotebookLMで検索・質問しやすい研究室ナレッジベースとして整理するためのリポジトリです。

Medium記事のRSS取得、記事一覧の取り込み、記事ごとのMarkdown化、本文ベース要約、テーマ別ドキュメント生成、検証ログ作成までをNode.jsスクリプトで管理します。

## 現在の成果物

- 対象記事数: 464件
- 本文ベースでレビュー済みの記事: 462件
- 本文未取得でメタデータのみの記事: 2件
- NotebookLM投入用のテーマ別ドキュメント: `distilled_v2/`
- 検証結果: `logs/distilled_v2_validation_report.md`

## ディレクトリ構成

| パス | 内容 |
| --- | --- |
| `feeds/` | Medium RSS URL一覧 |
| `raw/rss/` | RSSやシート由来の記事JSON |
| `articles/` | 初期版の記事別Markdown |
| `articles_fulltext/` | 本文取得・精査後の記事別Markdown |
| `distilled/` | 初期版のNotebookLM用テーマ別ドキュメント |
| `distilled_v2/` | `articles_fulltext/` を唯一の入力にした最新版ドキュメント |
| `index/` | 記事一覧CSV・Markdown |
| `eval/` | NotebookLM回答精度を検証するための評価質問セット |
| `logs/` | 取得失敗ログ、生成レポート、検証レポート |
| `scripts/` | 取得・変換・生成スクリプト |

## 主要な出力

`distilled_v2/` には、NotebookLMへ投入するためのテーマ別Markdownを生成しています。

- `01_lab_overview.md`
- `02_openstreetmap.md`
- `03_humanitarian_mapping.md`
- `04_events.md`
- `05_gis_tools.md`
- `06_student_projects.md`
- `07_fieldwork.md`
- `08_timeline_index.md`
- `09_glossary.md`
- `10_source_quality_report.md`
- `source_article_map.csv`

## セットアップ

Node.js 18以上を使用します。

```sh
npm install
```

このリポジトリのスクリプトは、追加のnpm依存パッケージなしで動く構成です。

## 使い方

### RSSから最新記事を取得する

`feeds/medium_feeds.txt` にMedium RSS URLを記載してから実行します。

```sh
npm run fetch:rss
```

取得結果は `raw/rss/articles.json` に保存されます。取得失敗は `logs/fetch_errors.log` に記録されます。

### 記事索引を生成する

```sh
npm run build:index
```

以下を生成します。

- `index/articles_index.csv`
- `index/articles_index.md`

### シート由来の要約を記事JSONへ統合する

```sh
npm run import:sheet-summary
```

### 記事別Markdownを生成する

```sh
npm run export:markdown
```

`raw/rss/articles.json` をもとに、`articles/` 配下へ1記事1Markdownを生成します。

### NotebookLM用テーマ別ドキュメントを生成する

最新版は `articles_fulltext/` のみを入力として使用します。

```sh
npm run build:distilled:v2
```

生成結果は `distilled_v2/` に出力されます。検証結果は `logs/distilled_v2_validation_report.md` に記録されます。

## summary_quality の扱い

`articles_fulltext/` の各記事には、本文取得状況を示す `summary_quality` を付けています。

| 値 | 意味 |
| --- | --- |
| `full_text_reviewed` | Medium本文を取得し、本文ベースで要約した記事 |
| `metadata_only` | 本文を取得できず、タイトル・著者・公開日・URL・タグなどの範囲で整理した記事 |

`metadata_only` の記事は、NotebookLMで扱う際に本文詳細の根拠として使わないよう注意が必要です。

## 検証

`build:distilled:v2` では、以下の観点を検証します。

- 464件すべての記事が `source_article_map.csv` に含まれているか
- すべての記事が少なくとも1つのテーマ別ファイルに反映されているか
- すべての記事に要約があるか
- `full_text_reviewed` と `metadata_only` の件数が一致しているか
- 古い `articles/` や `distilled/` を入力に使っていないか
- 汎用的すぎる要約表現や英単語断片が混ざっていないか

現在の検証結果はPASSです。

## 注意事項

- `raw/fulltext/` は本文取得時の中間キャッシュのため、Git管理対象外です。
- Mediumへの過剰なアクセスを避けるため、本文取得は失敗時にログを残し、レート制限に配慮して実行します。
- NotebookLM用ドキュメントでは、元記事に書かれていない事実を推測で補完しない方針です。

## GitHub

このリポジトリは、作業成果を共有・保存するためにGitHubへpushしています。
