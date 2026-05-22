# distilled_v2 validation report

## Result

- status: PASS

## Checks

- PASS 1. source_article_map.csv has 464 articles: rows=464
- PASS 2. every article has a distilled_v2 theme file: unmapped=0
- PASS 3. every article has a summary: summaries=464
- PASS 4. source map has_summary is true for every row: has_summary is generated from non-empty summaries
- PASS 5. full_text_reviewed count matches source quality report: count=462
- PASS 6. metadata_only count matches source quality report: count=2
- PASS 7. theme counts match source map counts: counts compared by routed label
- PASS 8. banned thin-summary phrase is absent: checked all generated summaries
- PASS 9. glossary excludes thin English fragments: checked normalized glossary terms
- PASS 10. old articles/ and distilled/ are not input: input_sources=articles_fulltext

## Repairs applied during this build

- `articles_fulltext/` の記事概要・重要ポイント・研究室活動としての意味だけを要約材料にし、テーマ別ファイルの全記事要約一覧を省略しない生成処理にした。
- `source_article_map.csv` の `has_summary` は全記事要約が空でないときだけ true になる検証にした。
