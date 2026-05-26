# 付録：実際に使用したプロンプト

このファイルは、古橋研究室のMediumブログ記事をNotebookLM用ナレッジベースとして整理する作業で使用した主なプロンプトを記録したものです。

再現性を残すため、作業時に使用したプロンプトを目的ごとに整理しています。

## プロンプト1：Medium RSS取得スクリプト作成

```text
このリポジトリは、古橋研究室のMediumブログをNotebookLM用ソースに整理するためのものです。

feeds/medium_feeds.txt にMediumのRSS URL一覧を置きます。
Node.jsまたはTypeScriptで、RSSを取得して記事タイトル、URL、著者、公開日、タグ、本文HTMLを抽出し、raw/rss/articles.json に保存するスクリプトを作ってください。

条件:
- RSS URLは feeds/medium_feeds.txt から読む
- 取得失敗したURLは logs/fetch_errors.log に記録
- 同じURLの記事は重複保存しない
- 出力JSONは後続処理しやすい形にする
- 著作権や非公開記事を無理に取得しない
```

## プロンプト2：記事一覧CSV・Markdown索引作成

```text
articles.json を読み込み、記事一覧のCSVとMarkdown索引を作ってください。

出力:
- index/articles_index.csv
- index/articles_index.md

分類ラベルは以下から選んでください:
- lab_overview
- openstreetmap
- humanitarian_mapping
- foss4g_sotm
- qgis_gis_tools
- student_project
- event_report
- fieldwork
- education
- other

各記事に、1〜2文の要約も付けてください。
```

## プロンプト3：記事を1記事1Markdownに変換

```text
raw/articles.json から各記事をMarkdown化してください。

各MarkdownにはYAML frontmatterを付けてください。
本文は以下の構成にしてください:
1. 元記事情報
2. 概要
3. 重要ポイント
4. 関連キーワード
5. 関連する古橋研究室の活動
6. NotebookLM向けメモ

元記事本文の表現は必要以上に丸写しせず、NotebookLMで検索・参照しやすい形に要約してください。
ただし、固有名詞、日付、イベント名、プロジェクト名は落とさないでください。
```

## プロンプト4：Medium記事本文を取得して高品質Markdownを再生成

```text
現在の /articles/*.md は、Medium記事本文ではなくRSSやシート由来の短い概要から生成されているため、要約が薄いです。

目的:
各Markdown内の url を使ってMedium記事本文を取得し、本文を精査したうえでNotebookLM用の高品質な記事要約Markdownに再生成してください。

やってほしいこと:
1. /articles/*.md を読み込み、frontmatter の url を取得する
2. 各URLから公開記事本文を取得する
3. タイトル、著者、公開日、タグ、URLを保持する
4. 本文から以下を抽出する
   - 何についての記事か
   - 具体的に何をしたのか
   - 使用されたツール・技術・場所・イベント名
   - 研究室活動としての意味
   - NotebookLMで質問に答えるための重要ポイント
5. 新しいMarkdownを /articles_fulltext/ に出力する

各記事Markdownの構成:
- 概要
- 重要ポイント
- 研究室活動としての意味
- 関連する人物・イベント・ツール・地名
- NotebookLMで答えられる質問例
- 抽出キーワード
- 元記事URL

注意:
- 元記事に書かれていない内容を推測しない
- 本文が取得できない場合は summary_quality: "metadata_only" とする
- 本文が取得できた場合は summary_quality: "full_text_reviewed" とする
- 「〜に関する短い活動記録」のような汎用表現は禁止
- 英単語の断片をキーワードにしない
- URL取得に失敗した記事は logs/fetch_failed_articles.csv に記録する
```

## プロンプト5：NotebookLM用テーマ別ドキュメントを生成

```text
articles_fulltext/ 配下のMarkdownを唯一の入力ソースとして、NotebookLM投入用のテーマ別ドキュメントを distilled_v2/ に再生成してください。

最重要方針:
今回の目的は「新しい解釈を加えた要約」ではなく、「articles_fulltext/ にある本文ベース要約を、NotebookLMで使いやすい形に正確に再配置・構造化すること」です。

特に重要:
464件すべての記事について、必ず記事内容の要約を作成してください。
代表記事だけでなく、代表記事に選ばれなかった記事についても、各テーマ別ファイル内で短い要約を記載してください。

禁止:
- 既存の articles/ を使わない
- 既存の distilled/ を使わない
- MediumのURLへ再アクセスしない
- articles_fulltext/ に書かれていない事実を補完しない
- 推測で背景説明を追加しない
- metadata_only の記事を full_text_reviewed と同じ精度で扱わない

入力:
- articles_fulltext/*.md のみ

出力:
- distilled_v2/01_lab_overview.md
- distilled_v2/02_openstreetmap.md
- distilled_v2/03_humanitarian_mapping.md
- distilled_v2/04_events.md
- distilled_v2/05_gis_tools.md
- distilled_v2/06_student_projects.md
- distilled_v2/07_fieldwork.md
- distilled_v2/08_timeline_index.md
- distilled_v2/09_glossary.md
- distilled_v2/10_source_quality_report.md
- distilled_v2/source_article_map.csv
- logs/build_distilled_v2_report.md
- logs/distilled_v2_validation_report.md

分類ルール:
- 各記事の frontmatter にある label を最優先する
- label がない場合のみ分類を推定する
- 推定分類した記事は logs/build_distilled_v2_report.md に必ず記録する

summary_quality の扱い:
- summary_quality: "full_text_reviewed" の記事は本文ベースの要約として扱う
- summary_quality: "metadata_only" の記事は本文未取得の記事として扱う
- metadata_only の記事は、タイトル・日付・著者・URL・タグ・既存概要の範囲だけで要約する
- metadata_only の記事について、本文にしか書かれていないはずの詳細を推測して書かない
- 各テーマ別ファイルに full_text_reviewed 件数と metadata_only 件数を明記する

各テーマ別ファイルの構成:
1. このドキュメントの目的
2. 対象記事数
3. full_text_reviewed 件数 / metadata_only 件数
4. このテーマの概要
5. 主要トピック
6. 時系列整理
7. 代表記事の詳しい要約
8. 全記事要約一覧
9. 研究室活動としての意味
10. 関連する人物・イベント・ツール・地名
11. NotebookLMで答えられる質問例
12. 参照元記事URL一覧

7. 代表記事の詳しい要約:
- 各テーマにつき full_text_reviewed の記事から5〜10件を代表記事として選ぶ
- 代表記事は、7. 代表記事の詳しい要約で必ず詳しく要約する
- 代表記事の詳しい要約は300〜600字程度を目安にする
- 代表記事の要約は articles_fulltext/ の「概要」「重要ポイント」「研究室活動としての意味」をもとに作る
- 代表記事ごとに以下を必ず記載する
  - タイトル
  - 公開日
  - 著者
  - URL
  - summary_quality
  - 詳しい要約
  - 重要ポイント
  - NotebookLMで参照すべき観点
- 代表記事は、8. 全記事要約一覧にも必ず掲載する
- どの記事を代表記事にしたか source_article_map.csv に記録する

8. 全記事要約一覧:
- そのテーマに分類されたすべての記事を掲載する
- 代表記事も含めて、全記事を掲載する
- 各記事について、必ず記事内容の要約を記載する
- 各記事の要約は100〜250字程度を目安にする
- full_text_reviewed の記事は、articles_fulltext/ 内の「概要」「重要ポイント」「研究室活動としての意味」をもとに要約する
- metadata_only の記事は、本文未取得であることを明記し、タイトル・タグ・既存概要の範囲で簡潔に要約する
- 各記事について以下を必ず記載する
  - タイトル
  - 公開日
  - 著者
  - URL
  - summary_quality
  - 要約
  - 関連キーワード
- 「タイトルだけ」「URLだけ」「日付だけ」の記事一覧にしない
- すべての記事に、NotebookLMが回答時に参照できる内容要約を持たせる
- 代表記事も含めて全記事を掲載する
- 代表記事が7章に掲載されていても、8章の全記事要約一覧から省略しない

08_timeline_index.md:
- 464件すべてを公開日順に並べる
- 各記事に title, published_at, author, url, label, summary_quality を表示する
- 各記事に100〜200字程度の短い要約を付ける
- full_text_reviewed と metadata_only が区別できるようにする

09_glossary.md:
- 人名、イベント名、地名、技術名、プロジェクト名、組織名を分ける
- OpenStreetMap / OSM など表記ゆれは統一する
- the, with, for, was, born, in など意味の薄い英単語断片は用語にしない
- qgis_gis_tools, student_project など分類ラベルは用語ではなく分類ラベルとして扱う

10_source_quality_report.md:
以下を必ず含める。
- 総記事数
- full_text_reviewed の件数
- metadata_only の件数
- ラベル別の記事数
- ラベル別の full_text_reviewed 件数
- ラベル別の metadata_only 件数
- metadata_only の記事一覧
- 本文未取得記事をNotebookLMで扱う際の注意点
- 今後の改善案

source_article_map.csv:
464件すべての記事について、どのdistilled_v2ファイルに反映されたかを記録する。

列:
- title
- published_at
- author
- url
- label
- summary_quality
- output_file
- included_in_section
- has_summary
- used_as_representative_article
- summary_length
- notes

included_in_section の値:
- representative_article
- all_article_summary_list
- both

has_summary:
- 全記事で true になること
- false の記事がある場合はエラーとして logs/distilled_v2_validation_report.md に記録する

検証:
生成後、必ず以下を確認し、logs/distilled_v2_validation_report.md に記録してください。

1. source_article_map.csv に464件すべての記事があるか
2. 各記事が少なくとも1つのdistilled_v2ファイルに反映されているか
3. 464件すべての記事に要約があるか
4. source_article_map.csv の has_summary が全件 true になっているか
5. articles_fulltext/ 内の full_text_reviewed 件数と distilled_v2/10_source_quality_report.md の件数が一致しているか
6. articles_fulltext/ 内の metadata_only 件数と distilled_v2/10_source_quality_report.md の件数が一致しているか
7. 各テーマ別ファイルの対象記事数と source_article_map.csv の件数が一致しているか
8. 「〜に関する短い活動記録」が含まれていないか
9. 英単語の断片が glossary に混ざっていないか
10. 古い articles/ や distilled/ を入力に使っていないか

問題があった場合:
- 修正してから再度検証する
- 修正内容を logs/distilled_v2_validation_report.md に追記する
```
