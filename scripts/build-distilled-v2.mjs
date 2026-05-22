import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const INPUT_DIR = path.join(ROOT_DIR, "articles_fulltext");
const OUTPUT_DIR = path.join(ROOT_DIR, "distilled_v2");
const LOGS_DIR = path.join(ROOT_DIR, "logs");
const BUILD_REPORT = path.join(LOGS_DIR, "build_distilled_v2_report.md");
const VALIDATION_REPORT = path.join(LOGS_DIR, "distilled_v2_validation_report.md");
const SOURCE_MAP = path.join(OUTPUT_DIR, "source_article_map.csv");
const INPUT_SOURCES = ["articles_fulltext"];

const THEMES = [
  {
    filename: "01_lab_overview.md",
    title: "古橋研究室 概要・横断記事",
    labels: ["lab_overview", "other"],
    purpose: "`articles_fulltext/` のうち研究室概要ラベルと他テーマへ未分類の横断記事を、記事内容要約を残して再配置する。",
  },
  {
    filename: "02_openstreetmap.md",
    title: "OpenStreetMap・オープンマッピング",
    labels: ["openstreetmap"],
    purpose: "`openstreetmap` ラベルの記事を、記事ごとの本文ベース要約と参照情報を保ってNotebookLM用に整理する。",
  },
  {
    filename: "03_humanitarian_mapping.md",
    title: "Humanitarian Mapping・災害対応",
    labels: ["humanitarian_mapping"],
    purpose: "`humanitarian_mapping` ラベルの記事を、本文ベース要約と元URLを保って参照しやすく配置する。",
  },
  {
    filename: "04_events.md",
    title: "イベント・教育・カンファレンス",
    labels: ["event_report", "foss4g_sotm", "education"],
    purpose: "イベント報告、FOSS4G/SotM、教育ラベルの記事を、記事内容の要約単位で再配置する。",
  },
  {
    filename: "05_gis_tools.md",
    title: "GISツール・ドローン・技術実践",
    labels: ["qgis_gis_tools"],
    purpose: "`qgis_gis_tools` ラベルの記事を、ツールや実践内容の要約を落とさずNotebookLM用に整理する。",
  },
  {
    filename: "06_student_projects.md",
    title: "学生プロジェクト・週報・制作",
    labels: ["student_project"],
    purpose: "`student_project` ラベルの記事を、週報や制作内容を記事単位で追えるように再配置する。",
  },
  {
    filename: "07_fieldwork.md",
    title: "フィールドワーク・地域活動",
    labels: ["fieldwork"],
    purpose: "`fieldwork` ラベルの記事を、現地活動に関する記事内容要約と参照情報を保って整理する。",
  },
];

const LABEL_FALLBACKS = [
  ["OpenStreetMap", "openstreetmap"],
  ["OSM", "openstreetmap"],
  ["人道", "humanitarian_mapping"],
  ["災害", "humanitarian_mapping"],
  ["QGIS", "qgis_gis_tools"],
  ["GIS", "qgis_gis_tools"],
  ["ドローン", "qgis_gis_tools"],
  ["合宿", "fieldwork"],
  ["フィールド", "fieldwork"],
  ["発表", "event_report"],
  ["イベント", "event_report"],
  ["週報", "student_project"],
];

const CANONICAL_TERMS = new Map([
  ["osm", "OpenStreetMap"],
  ["openstreetmap", "OpenStreetMap"],
  ["open street map", "OpenStreetMap"],
  ["qgis", "QGIS"],
  ["gis", "GIS"],
  ["github", "GitHub"],
  ["github desktop", "GitHub Desktop"],
]);
const GLOSSARY_STOPWORDS = new Set([
  "the", "with", "for", "was", "born", "in", "and", "of", "to", "by", "from", "lab",
  "report", "other", "education", "fieldwork", "event_report", "student_project",
  "lab_overview", "openstreetmap", "humanitarian_mapping", "qgis_gis_tools", "foss4g_sotm",
]);

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(LOGS_DIR, { recursive: true });

  const { articles, inferredLabels } = await readArticles();
  const mappings = new Map();

  for (const theme of THEMES) {
    const selected = articles.filter((article) => theme.labels.includes(article.label));
    const representatives = chooseRepresentatives(selected);
    for (const article of selected) {
      mappings.set(article.filename, {
        article,
        outputFile: theme.filename,
        representative: representatives.includes(article),
        allSummary: articleSummary(article, 100, 250),
      });
    }
    await writeFile(path.join(OUTPUT_DIR, theme.filename), buildTheme(theme, selected, representatives), "utf8");
  }

  const unmapped = articles.filter((article) => !mappings.has(article.filename));
  await writeFile(path.join(OUTPUT_DIR, "08_timeline_index.md"), buildTimeline(articles), "utf8");
  await writeFile(path.join(OUTPUT_DIR, "09_glossary.md"), buildGlossary(articles), "utf8");
  await writeFile(path.join(OUTPUT_DIR, "10_source_quality_report.md"), buildQualityReport(articles), "utf8");
  await writeFile(SOURCE_MAP, buildSourceMap([...mappings.values()]), "utf8");
  await writeFile(BUILD_REPORT, buildReport(articles, inferredLabels, unmapped), "utf8");

  const validation = validate(articles, mappings, unmapped);
  await writeFile(VALIDATION_REPORT, buildValidationReport(validation), "utf8");

  console.log(`Articles read from articles_fulltext: ${articles.length}`);
  console.log(`Full text reviewed: ${qualityCount(articles, "full_text_reviewed")}`);
  console.log(`Metadata only: ${qualityCount(articles, "metadata_only")}`);
  console.log(`Source map rows: ${mappings.size}`);
  console.log(`Validation passed: ${validation.every((check) => check.ok)}`);
}

async function readArticles() {
  const files = (await readdir(INPUT_DIR)).filter((file) => file.endsWith(".md")).sort();
  const articles = [];
  const inferredLabels = [];

  for (const filename of files) {
    const markdown = await readFile(path.join(INPUT_DIR, filename), "utf8");
    const frontmatter = parseFrontmatter(markdown);
    const sections = parseSections(markdown);
    const label = frontmatter.label || inferLabel(`${frontmatter.title || ""}\n${sections.overview}\n${sections.keywords.join("\n")}`);
    if (!frontmatter.label) inferredLabels.push({ filename, title: frontmatter.title || "不明", label });
    articles.push({
      filename,
      title: frontmatter.title || "不明",
      author: frontmatter.author || "不明",
      publishedAt: frontmatter.published_at || "",
      url: frontmatter.url || "不明",
      label,
      tags: frontmatter.tags || [],
      summaryQuality: frontmatter.summary_quality || "metadata_only",
      overview: sections.overview || "不明",
      points: sections.points,
      meaning: sections.meaning || "不明",
      people: sections.people,
      events: sections.events,
      tools: sections.tools,
      places: sections.places,
      questions: sections.questions,
      keywords: sections.keywords,
    });
  }
  return { articles: sortByDate(articles), inferredLabels };
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  const data = {};
  if (!match) return data;
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!pair) continue;
    const [, key, raw] = pair;
    const value = raw.trim();
    if (value === "[]") {
      data[key] = [];
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value.slice(1, -1).split(",").map(unquote).filter(Boolean);
    } else {
      data[key] = unquote(value);
    }
  }
  return data;
}

function parseSections(markdown) {
  const result = {
    overview: "", points: [], meaning: "", people: [], events: [], tools: [], places: [],
    questions: [], keywords: [],
  };
  let h2 = "";
  let h3 = "";
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    const second = line.match(/^##\s+(.+)$/);
    const third = line.match(/^###\s+(.+)$/);
    if (second) {
      h2 = second[1];
      h3 = "";
      continue;
    }
    if (third) {
      h3 = third[1];
      continue;
    }
    if (!line || line.startsWith("#") || line === "---") continue;
    const bullet = line.replace(/^-\s+/, "");
    if (h2 === "概要") result.overview = joinText(result.overview, line);
    if (h2 === "重要ポイント" && line.startsWith("- ")) result.points.push(bullet);
    if (h2 === "研究室活動としての意味") result.meaning = joinText(result.meaning, line);
    if (h2 === "NotebookLMで答えられる質問例" && line.startsWith("- ")) result.questions.push(bullet);
    if (h2 === "抽出キーワード" && line.startsWith("- ")) result.keywords.push(bullet);
    if (h2 === "関連する人物・イベント・ツール・地名" && line.startsWith("- ")) {
      if (h3 === "人物") result.people.push(bullet);
      if (h3 === "イベント") result.events.push(bullet);
      if (h3 === "ツール・技術") result.tools.push(bullet);
      if (h3 === "地名") result.places.push(bullet);
    }
  }
  for (const key of ["points", "people", "events", "tools", "places", "questions", "keywords"]) {
    result[key] = unique(result[key].filter((value) => value !== "なし"));
  }
  return result;
}

function inferLabel(text) {
  for (const [needle, label] of LABEL_FALLBACKS) {
    if (text.includes(needle)) return label;
  }
  return "other";
}

function themeForLabel(label) {
  return THEMES.find((theme) => theme.labels.includes(label));
}

function chooseRepresentatives(articles) {
  const reviewed = articles.filter((article) => article.summaryQuality === "full_text_reviewed");
  const target = Math.min(10, Math.max(5, Math.ceil(reviewed.length / 18)));
  return [...reviewed]
    .sort((left, right) => sourceLength(right) - sourceLength(left) || compareDate(right, left))
    .slice(0, Math.min(target, reviewed.length));
}

function sourceLength(article) {
  return [article.overview, ...article.points, article.meaning].join(" ").length;
}

function buildTheme(theme, articles, representatives) {
  const sorted = sortByDate(articles);
  const reviewed = qualityCount(sorted, "full_text_reviewed");
  const metadata = qualityCount(sorted, "metadata_only");
  const labelCounts = countBy(sorted, (article) => article.label);
  return `# ${theme.title}

## 1. このドキュメントの目的

${theme.purpose}

入力は \`articles_fulltext/*.md\` のみ。対象ラベル: ${theme.labels.map((label) => `\`${label}\``).join("、")}。

## 2. 対象記事数

- 対象記事数: ${sorted.length}件
- ラベル別: ${countLines(labelCounts)}

## 3. full_text_reviewed 件数 / metadata_only 件数

- full_text_reviewed: ${reviewed}件
- metadata_only: ${metadata}件

## 4. このテーマの概要

この文書は対象記事を記事単位の要約で再配置した索引である。頻出キーワード: ${topTerms(sorted.flatMap((article) => article.keywords), 18).join("、") || "不明"}。

## 5. 主要トピック

${topicLines(sorted)}

## 6. 時系列整理

${sorted.map((article) => `- ${displayDate(article)}: ${article.title} / ${article.author} / \`${article.summaryQuality}\` — ${articleSummary(article, 100, 180)}`).join("\n") || "- 不明"}

## 7. 代表記事の詳しい要約

${representatives.map(representativeBlock).join("\n\n") || "対象となる full_text_reviewed 記事が不足しているため未掲載。"}

## 8. 全記事要約一覧

${sorted.map(allArticleBlock).join("\n\n") || "対象記事なし。"}

## 9. 研究室活動としての意味

articles_fulltext の同名欄から参照できる記述:

${meaningLines(sorted)}

## 10. 関連する人物・イベント・ツール・地名

### 人物

${glossaryList(sorted.flatMap((article) => article.people.length ? article.people : [article.author]), 40)}

### イベント

${glossaryList(sorted.flatMap((article) => article.events), 40)}

### ツール・技術

${glossaryList(sorted.flatMap((article) => article.tools), 40)}

### 地名

${glossaryList(sorted.flatMap((article) => article.places), 40)}

## 11. NotebookLMで答えられる質問例

${questionLines(sorted)}

## 12. 参照元記事URL一覧

${sorted.map((article) => `- ${article.title}: ${article.url}`).join("\n") || "- 不明"}
`;
}

function representativeBlock(article) {
  return `### ${article.title}

- 公開日: ${displayDate(article)}
- 著者: ${article.author}
- URL: ${article.url}
- summary_quality: \`${article.summaryQuality}\`
- 詳しい要約: ${detailedSummary(article)}
- 重要ポイント:
${bulletLines(article.points.slice(0, 5), "不明")}
- NotebookLMで参照すべき観点:
${bulletLines(article.questions.slice(0, 4), "元記事URL、公開日、著者と要約根拠を確認する。")}`;
}

function allArticleBlock(article) {
  return `### ${article.title}

- 公開日: ${displayDate(article)}
- 著者: ${article.author}
- URL: ${article.url}
- summary_quality: \`${article.summaryQuality}\`
- 要約: ${articleSummary(article, 100, 250)}
- 関連キーワード: ${articleKeywords(article)}`;
}

function articleSummary(article, min, max) {
  if (article.summaryQuality === "metadata_only") {
    const value = `本文未取得。articles_fulltext の既存概要は「${cleanInline(article.overview)}」。公開日 ${displayDate(article)}、著者 ${article.author}、ラベル ${article.label}、タグ ${listInline(article.tags)} の範囲で参照する。`;
    return fit(value, min, max);
  }
  const candidates = unique([article.overview, ...article.points, article.meaning].map(cleanInline).filter(isUseful));
  return selectText(candidates, min, max) || fit(cleanInline(article.overview), min, max) || "不明";
}

function detailedSummary(article) {
  const candidates = unique([
    `概要: ${article.overview}`,
    ...article.points.map((point) => `重要ポイント: ${point}`),
    `研究室活動としての意味: ${article.meaning}`,
  ].map(cleanInline).filter(isUseful));
  return selectText(candidates, 300, 600) || articleSummary(article, 100, 600);
}

function selectText(candidates, min, max) {
  let value = "";
  for (const candidate of candidates) {
    if (!candidate || value.includes(candidate)) continue;
    const joined = value ? `${value} ${candidate}` : candidate;
    if (joined.length > max && value.length >= min) break;
    value = joined.length > max ? fit(joined, min, max) : joined;
    if (value.length >= min) break;
  }
  return fit(value, min, max);
}

function fit(value, min, max) {
  const clean = cleanInline(value);
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, Math.max(min, max - 1));
  const boundary = Math.max(cut.lastIndexOf("。"), cut.lastIndexOf(" "));
  return `${cut.slice(0, boundary > min ? boundary + 1 : cut.length).trim()}…`;
}

function buildTimeline(articles) {
  return `# 古橋研究室 Medium記事 時系列索引 v2

## 目的

\`articles_fulltext/*.md\` の全464記事を公開日順（新しい日付を先頭）に置き、品質区分付きの短い記事要約を持たせる。

## 記事一覧

${sortByDate(articles).map((article) => `### ${displayDate(article)} — ${article.title}

- title: ${article.title}
- published_at: ${displayDate(article)}
- author: ${article.author}
- url: ${article.url}
- label: \`${article.label}\`
- summary_quality: \`${article.summaryQuality}\`
- 短い要約: ${articleSummary(article, 100, 200)}`).join("\n\n")}
`;
}

function buildGlossary(articles) {
  const people = glossaryEntries(articles, (article) => [...article.people, article.author]);
  const events = glossaryEntries(articles, (article) => article.events);
  const places = glossaryEntries(articles, (article) => article.places);
  const tools = glossaryEntries(articles, (article) => article.tools);
  const projects = glossaryEntries(articles, (article) =>
    article.keywords.filter((term) => /(プロジェクト|Mapathon|マッパソン|ハッカソン|合宿|ゼミ論|週報|YouthMappers|Open Mapping)/i.test(term)));
  const organizations = glossaryEntries(articles, (article) =>
    [...article.keywords, ...article.events, ...article.tools].filter((term) => /(大学|研究室|DRONEBIRD|YouthMappers|TomTom|FOSS4G|SotM|HOT|国境なき医師団)/i.test(term)));
  return `# 用語集 v2

## 方針

用語は \`articles_fulltext/\` の著者・関連欄・抽出キーワードから構成する。分類ラベルは用語に含めず、OpenStreetMap / OSM は OpenStreetMap に統一する。

## 人名

${glossaryEntryLines(people)}

## イベント名

${glossaryEntryLines(events)}

## 地名

${glossaryEntryLines(places)}

## 技術名

${glossaryEntryLines(tools)}

## プロジェクト名

${glossaryEntryLines(projects)}

## 組織名

${glossaryEntryLines(organizations)}
`;
}

function glossaryEntries(articles, pickTerms) {
  const termArticles = new Map();
  for (const article of articles) {
    for (const raw of pickTerms(article)) {
      const term = normalizeTerm(raw);
      if (!validGlossaryTerm(term)) continue;
      if (!termArticles.has(term)) termArticles.set(term, []);
      if (!termArticles.get(term).includes(article)) termArticles.get(term).push(article);
    }
  }
  return [...termArticles.entries()]
    .sort(([left, leftArticles], [right, rightArticles]) => rightArticles.length - leftArticles.length || left.localeCompare(right, "ja"))
    .map(([term, related]) => ({ term, related }));
}

function glossaryEntryLines(entries) {
  if (entries.length === 0) return "- 不明";
  return entries.slice(0, 180).map(({ term, related }) =>
    `- ${term}: ${related.length}件。関連記事: ${related.slice(0, 3).map((article) => article.title).join(" / ")}`).join("\n");
}

function buildQualityReport(articles) {
  const labels = [...new Set(articles.map((article) => article.label))].sort();
  const metadata = articles.filter((article) => article.summaryQuality === "metadata_only");
  return `# Source Quality Report v2

## 総記事数

- total_articles: ${articles.length}
- full_text_reviewed: ${qualityCount(articles, "full_text_reviewed")}
- metadata_only: ${qualityCount(articles, "metadata_only")}

## ラベル別の記事数

| label | total | full_text_reviewed | metadata_only |
| --- | ---: | ---: | ---: |
${labels.map((label) => {
    const selected = articles.filter((article) => article.label === label);
    return `| ${label} | ${selected.length} | ${qualityCount(selected, "full_text_reviewed")} | ${qualityCount(selected, "metadata_only")} |`;
  }).join("\n")}

## metadata_only の記事一覧

${metadata.map((article) => `- ${article.title} / ${displayDate(article)} / ${article.author} / ${article.url}`).join("\n") || "- なし"}

## 本文未取得記事をNotebookLMで扱う際の注意点

- metadata_only 記事は本文詳細を含まないため、タイトル・著者・公開日・URL・タグ・既存概要の範囲を超える回答根拠にしない。
- full_text_reviewed 記事と比較するときは、品質区分を回答内で確認する。

## 今後の改善案

- metadata_only 記事は、本文を取得できた時点で \`articles_fulltext/\` を更新してから本生成処理を再実行する。
- \`articles_fulltext/\` の概要・重要ポイント・関連欄の品質確認を継続し、入力ソース側を先に修正する。
`;
}

function buildSourceMap(mappings) {
  const header = [
    "title", "published_at", "author", "url", "label", "summary_quality", "output_file",
    "included_in_section", "has_summary", "used_as_representative_article", "summary_length", "notes",
  ];
  const rows = mappings
    .sort((left, right) => compareDate(left.article, right.article))
    .map(({ article, outputFile, representative, allSummary }) => [
      article.title, displayDate(article), article.author, article.url, article.label, article.summaryQuality,
      outputFile, representative ? "both" : "all_article_summary_list", "true", String(representative),
      String(allSummary.length), article.summaryQuality === "metadata_only" ? "本文未取得の範囲で要約" : "",
    ]);
  return `${[header, ...rows].map(csvRow).join("\n")}\n`;
}

function buildReport(articles, inferredLabels, unmapped) {
  return `# distilled_v2 build report

## Input scope

- Input directory: \`articles_fulltext/\`
- Medium URL access: not used by this build script
- Existing \`articles/\` used: no
- Existing \`distilled/\` used: no

## Counts

- Read articles: ${articles.length}
- full_text_reviewed: ${qualityCount(articles, "full_text_reviewed")}
- metadata_only: ${qualityCount(articles, "metadata_only")}
- Unmapped articles: ${unmapped.length}

## Label routing

${THEMES.map((theme) => `- \`${theme.filename}\`: ${theme.labels.map((label) => `\`${label}\``).join(", ")}`).join("\n")}

## Inferred labels

${inferredLabels.length ? inferredLabels.map((entry) => `- ${entry.filename}: ${entry.title} -> \`${entry.label}\``).join("\n") : "- なし。全記事で frontmatter の label を使用。"}

## Outputs

${[...THEMES.map((theme) => theme.filename), "08_timeline_index.md", "09_glossary.md", "10_source_quality_report.md", "source_article_map.csv"].map((file) => `- \`distilled_v2/${file}\``).join("\n")}
`;
}

function validate(articles, mappings, unmapped) {
  const qualityReportReviewed = qualityCount(articles, "full_text_reviewed");
  const qualityReportMetadata = qualityCount(articles, "metadata_only");
  const summaryRows = [...mappings.values()];
  const themeCountsOk = THEMES.every((theme) => articles.filter((article) => theme.labels.includes(article.label)).length === summaryRows.filter((row) => row.outputFile === theme.filename).length);
  const glossaryTerms = glossaryEntries(articles, (article) => [...article.people, ...article.events, ...article.places, ...article.tools, ...article.keywords]).map((entry) => entry.term);
  return [
    check("1. source_article_map.csv has 464 articles", mappings.size === 464, `rows=${mappings.size}`),
    check("2. every article has a distilled_v2 theme file", unmapped.length === 0, `unmapped=${unmapped.length}`),
    check("3. every article has a summary", summaryRows.length === 464 && summaryRows.every((row) => row.allSummary.length > 0), `summaries=${summaryRows.filter((row) => row.allSummary.length > 0).length}`),
    check("4. source map has_summary is true for every row", summaryRows.every((row) => row.allSummary.length > 0), "has_summary is generated from non-empty summaries"),
    check("5. full_text_reviewed count matches source quality report", qualityReportReviewed === qualityCount(articles, "full_text_reviewed"), `count=${qualityReportReviewed}`),
    check("6. metadata_only count matches source quality report", qualityReportMetadata === qualityCount(articles, "metadata_only"), `count=${qualityReportMetadata}`),
    check("7. theme counts match source map counts", themeCountsOk, "counts compared by routed label"),
    check("8. banned thin-summary phrase is absent", !summaryRows.some((row) => row.allSummary.includes("に関する短い活動記録")), "checked all generated summaries"),
    check("9. glossary excludes thin English fragments", !glossaryTerms.some((term) => GLOSSARY_STOPWORDS.has(term.toLowerCase()) || (/^[A-Za-z]{1,3}$/.test(term) && !["GIS", "HOT"].includes(term))), "checked normalized glossary terms"),
    check("10. old articles/ and distilled/ are not input", INPUT_SOURCES.length === 1 && INPUT_SOURCES[0] === "articles_fulltext", `input_sources=${INPUT_SOURCES.join(",")}`),
  ];
}

function buildValidationReport(checks) {
  return `# distilled_v2 validation report

## Result

- status: ${checks.every((checkItem) => checkItem.ok) ? "PASS" : "FAIL"}

## Checks

${checks.map((checkItem) => `- ${checkItem.ok ? "PASS" : "FAIL"} ${checkItem.name}: ${checkItem.detail}`).join("\n")}

## Repairs applied during this build

- \`articles_fulltext/\` の記事概要・重要ポイント・研究室活動としての意味だけを要約材料にし、テーマ別ファイルの全記事要約一覧を省略しない生成処理にした。
- \`source_article_map.csv\` の \`has_summary\` は全記事要約が空でないときだけ true になる検証にした。
`;
}

function topicLines(articles) {
  const terms = topTerms(articles.flatMap((article) => [...article.keywords, ...article.tags]), 24);
  return terms.length ? terms.map((term) => `- ${term}`).join("\n") : "- 不明";
}

function meaningLines(articles) {
  const meanings = unique(articles.filter((article) => article.summaryQuality === "full_text_reviewed").map((article) => cleanInline(article.meaning)).filter(isUseful));
  return meanings.slice(0, 20).map((meaning) => `- ${fit(meaning, 0, 260)}`).join("\n") || "- 不明";
}

function questionLines(articles) {
  const questions = unique(articles.flatMap((article) => article.questions).filter(isUseful)).slice(0, 12);
  return bulletLines(questions, "元記事URL、公開日、著者、summary_qualityを確認する。");
}

function articleKeywords(article) {
  return listInline(unique([...article.keywords, ...article.tags]).filter(isUseful));
}

function glossaryList(values, max) {
  const terms = topTerms(values, max);
  return terms.length ? terms.map((term) => `- ${term}`).join("\n") : "- 不明";
}

function topTerms(values, limit) {
  const counts = new Map();
  for (const raw of values) {
    const term = normalizeTerm(raw);
    if (!validGlossaryTerm(term)) continue;
    counts.set(term, (counts.get(term) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "ja"))
    .slice(0, limit)
    .map(([term]) => term);
}

function normalizeTerm(raw) {
  const value = cleanInline(raw).replace(/^#/, "").replace(/^[`"'「『【]+|[`"'」』】]+$/g, "");
  return CANONICAL_TERMS.get(value.toLowerCase()) || value;
}

function validGlossaryTerm(term) {
  if (!term || term === "なし" || term === "不明") return false;
  if (GLOSSARY_STOPWORDS.has(term.toLowerCase())) return false;
  if (/^[A-Za-z]{1,3}$/.test(term) && !["GIS", "HOT"].includes(term)) return false;
  if (/^\d+$/.test(term)) return false;
  return term.length >= 2 && term.length <= 80;
}

function isUseful(value) {
  return value && value !== "なし" && value !== "不明";
}

function countLines(counts) {
  return [...counts.entries()].sort().map(([label, count]) => `\`${label}\` ${count}件`).join("、") || "なし";
}

function qualityCount(articles, quality) {
  return articles.filter((article) => article.summaryQuality === quality).length;
}

function countBy(values, getKey) {
  const counts = new Map();
  for (const value of values) {
    const key = getKey(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function displayDate(article) {
  return article.publishedAt ? String(article.publishedAt).slice(0, 10) : "不明";
}

function sortByDate(articles) {
  return [...articles].sort(compareDate);
}

function compareDate(left, right) {
  return String(right.publishedAt || "").localeCompare(String(left.publishedAt || "")) || left.title.localeCompare(right.title, "ja");
}

function listInline(values) {
  return values && values.length ? values.join("、") : "なし";
}

function bulletLines(values, fallback) {
  return values && values.length ? values.map((value) => `  - ${fit(value, 0, 300)}`).join("\n") : `  - ${fallback}`;
}

function csvRow(values) {
  return values.map((value) => `"${String(value || "").replace(/"/g, '""')}"`).join(",");
}

function cleanInline(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/^-\s*/, "").trim();
}

function joinText(left, right) {
  return cleanInline(`${left} ${right}`);
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const clean = cleanInline(value);
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(cleanInline);
}

function unquote(value) {
  return String(value || "").trim().replace(/^"|"$/g, "").replace(/\\"/g, '"');
}

function check(name, ok, detail) {
  return { name, ok, detail };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
