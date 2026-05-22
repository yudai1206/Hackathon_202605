# distilled_v2 build report

## Input scope

- Input directory: `articles_fulltext/`
- Medium URL access: not used by this build script
- Existing `articles/` used: no
- Existing `distilled/` used: no

## Counts

- Read articles: 464
- full_text_reviewed: 462
- metadata_only: 2
- Unmapped articles: 0

## Label routing

- `01_lab_overview.md`: `lab_overview`, `other`
- `02_openstreetmap.md`: `openstreetmap`
- `03_humanitarian_mapping.md`: `humanitarian_mapping`
- `04_events.md`: `event_report`, `foss4g_sotm`, `education`
- `05_gis_tools.md`: `qgis_gis_tools`
- `06_student_projects.md`: `student_project`
- `07_fieldwork.md`: `fieldwork`

## Inferred labels

- なし。全記事で frontmatter の label を使用。

## Outputs

- `distilled_v2/01_lab_overview.md`
- `distilled_v2/02_openstreetmap.md`
- `distilled_v2/03_humanitarian_mapping.md`
- `distilled_v2/04_events.md`
- `distilled_v2/05_gis_tools.md`
- `distilled_v2/06_student_projects.md`
- `distilled_v2/07_fieldwork.md`
- `distilled_v2/08_timeline_index.md`
- `distilled_v2/09_glossary.md`
- `distilled_v2/10_source_quality_report.md`
- `distilled_v2/source_article_map.csv`
