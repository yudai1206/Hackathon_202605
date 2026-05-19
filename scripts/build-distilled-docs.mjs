import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ARTICLES_DIR = path.join(ROOT_DIR, "articles");
const OUTPUT_DIR = path.join(ROOT_DIR, "distilled");

const DOCUMENTS = [
  {
    filename: "01_lab_overview.md",
    title: "古橋研究室 概要・活動全体",
    labels: ["lab_overview"],
    purpose: "古橋研究室の活動紹介、研究室運営、広報、チーム活動をNotebookLMで参照しやすい形に再構成する。",
  },
  {
    filename: "02_openstreetmap.md",
    title: "OpenStreetMap・オープンマッピング",
    labels: ["openstreetmap"],
    purpose: "OpenStreetMap、YouthMappers、地図編集、オープンマッピングに関する記事をまとめ、学習・質問の入口にする。",
  },
  {
    filename: "03_humanitarian_mapping.md",
    title: "Humanitarian Mapping・災害対応",
    labels: ["humanitarian_mapping"],
    purpose: "人道支援、災害対応、クライシスマッピング、社会課題解決型マッピングに関する記事を整理する。",
  },
  {
    filename: "04_events.md",
    title: "イベント・発表・コミュニティ活動",
    labels: ["event_report", "foss4g_sotm", "education"],
    purpose: "ジオ展、FOSS4G、State of the Map、講義、勉強会、ワークショップなどのイベント系記事をまとめる。",
  },
  {
    filename: "05_gis_tools.md",
    title: "GISツール・ドローン・技術実践",
    labels: ["qgis_gis_tools"],
    purpose: "QGIS、GIS、ドローン、ODM、3Dモデル、地理空間ツールに関する技術実践を整理する。",
  },
  {
    filename: "06_student_projects.md",
    title: "学生プロジェクト・週報・制作活動",
    labels: ["student_project"],
    purpose: "学生プロジェクト、週報、ゼミ活動、卒業研究、チーム制作の記事を学習しやすくまとめる。",
  },
  {
    filename: "07_fieldwork.md",
    title: "フィールドワーク・現地調査・地域連携",
    labels: ["fieldwork"],
    purpose: "フィールドワーク、現地調査、地域連携、実地での観察・制作活動に関する記事を整理する。",
  },
];

async function main() {
  const articles = await readArticles();
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const document of DOCUMENTS) {
    const selectedArticles = articles.filter((article) => document.labels.includes(article.label));
    await writeFile(
      path.join(OUTPUT_DIR, document.filename),
      buildThemeDocument(document, selectedArticles),
      "utf8",
    );
  }

  await writeFile(
    path.join(OUTPUT_DIR, "08_timeline_index.md"),
    buildTimelineDocument(articles),
    "utf8",
  );
  await writeFile(
    path.join(OUTPUT_DIR, "09_glossary.md"),
    buildGlossaryDocument(articles),
    "utf8",
  );

  console.log(`Articles read: ${articles.length}`);
  console.log(`Documents written: ${DOCUMENTS.length + 2}`);
  console.log(`Output directory: ${path.relative(ROOT_DIR, OUTPUT_DIR)}`);
}

async function readArticles() {
  const filenames = (await readdir(ARTICLES_DIR))
    .filter((filename) => filename.endsWith(".md"))
    .sort();
  const articles = [];

  for (const filename of filenames) {
    const markdown = await readFile(path.join(ARTICLES_DIR, filename), "utf8");
    const frontmatter = parseFrontmatter(markdown);
    const sections = parseSections(markdown);

    articles.push({
      filename,
      title: frontmatter.title || sectionField(sections.info, "タイトル") || "不明",
      url: frontmatter.url || sectionField(sections.info, "URL") || "不明",
      author: frontmatter.author || sectionField(sections.info, "著者") || "不明",
      publishedAt: frontmatter.published_at || "",
      publishedDate: formatDate(frontmatter.published_at) || sectionField(sections.info, "公開日") || "不明",
      label: frontmatter.label || "other",
      tags: frontmatter.tags || [],
      summary: sections.summary || "不明",
      points: sections.points,
      keywords: sections.keywords,
      activityMeaning: sections.activityMeaning || "不明",
      notebookMemo: sections.notebookMemo || "不明",
    });
  }

  return articles.sort((left, right) => String(right.publishedAt).localeCompare(String(left.publishedAt)));
}

function buildThemeDocument(document, articles) {
  const sortedArticles = sortByDateDesc(articles);
  const keywords = topTerms(sortedArticles.flatMap((article) => [...article.tags, ...article.keywords]), 30);
  const names = properNouns(sortedArticles);
  const topics = majorTopics(sortedArticles);

  return `# ${document.title}

## 1. このドキュメントの目的

${document.purpose}

対象記事数: ${sortedArticles.length}件。対象分類ラベル: ${document.labels.map((label) => `\`${label}\``).join(", ")}。

## 2. 関連する記事一覧

${articleList(sortedArticles)}

## 3. 時系列整理

${timelineList(sortedArticles)}

## 4. 主要トピック

${topics.length > 0 ? topics.map((topic) => `- ${topic}`).join("\n") : "- 不明"}

## 5. 重要な固有名詞

${names.length > 0 ? names.map((name) => `- ${name}`).join("\n") : "- 不明"}

## 6. 研究室活動としての意味

${activityMeaning(sortedArticles)}

## 7. NotebookLMが回答時に参照すべき観点

- 回答では、必ず該当記事の元記事URL、公開日、著者を確認する。
- 日付、イベント名、プロジェクト名、人名は記事内の表記を優先し、不明なものは「不明」とする。
- 記事間の比較では、分類ラベル、タグ、公開年、著者、関連キーワードを手がかりにする。
- このテーマで頻出する検索語: ${keywords.length > 0 ? keywords.join("、") : "不明"}
`;
}

function buildTimelineDocument(articles) {
  const byYear = groupBy(articles, (article) =>
    article.publishedDate && article.publishedDate !== "不明" ? article.publishedDate.slice(0, 4) : "不明",
  );

  const yearSections = [...byYear.entries()]
    .sort(([left], [right]) => String(right).localeCompare(String(left)))
    .map(([year, yearArticles]) => {
      const entries = sortByDateDesc(yearArticles)
        .map((article) => `- ${article.publishedDate}: ${article.title} / 著者: ${article.author} / 分類: \`${article.label}\` / URL: ${article.url}`)
        .join("\n");
      return `### ${year}\n\n${entries}`;
    })
    .join("\n\n");

  return `# 古橋研究室 Medium記事 時系列索引

## 1. このドキュメントの目的

全Markdown記事を公開日順に並べ、NotebookLMで時期別の活動変化、イベント、プロジェクト、著者をたどりやすくする。

## 2. 関連する記事一覧

対象記事数: ${articles.length}件。全記事を対象とする。

## 3. 時系列整理

${yearSections || "不明"}

## 4. 主要トピック

${majorTopics(articles).map((topic) => `- ${topic}`).join("\n")}

## 5. 重要な固有名詞

${properNouns(articles).slice(0, 80).map((name) => `- ${name}`).join("\n")}

## 6. 研究室活動としての意味

この時系列索引は、古橋研究室のMedium記事を年・日付単位で追跡するための参照軸である。各記事の本文内容ではなく、公開日、著者、分類、URLを中心に、活動の流れを確認するために使う。

## 7. NotebookLMが回答時に参照すべき観点

- 期間を問われた場合は、この時系列整理で該当年・該当日を確認する。
- 記事の内容に踏み込む場合は、必ず各テーマ別ドキュメントまたは元記事Markdownの概要・重要ポイントに戻る。
- 日付が不明な記事は「不明」として扱い、推測で補完しない。
`;
}

function buildGlossaryDocument(articles) {
  const terms = topTerms(
    articles.flatMap((article) => [...article.tags, ...article.keywords, article.label]),
    120,
  );
  const lines = terms.map((term) => {
    const relatedArticles = articles
      .filter((article) => articleMatchesTerm(article, term))
      .slice(0, 5);
    const related = relatedArticles
      .map((article) => `${article.title} (${article.publishedDate}, ${article.author}) URL: ${article.url}`)
      .join(" / ");
    return `- ${term}: 関連記事 ${relatedArticles.length > 0 ? related : "不明"}`;
  });

  return `# 古橋研究室 Medium記事 用語集

## 1. このドキュメントの目的

全記事に現れるタグ、分類ラベル、関連キーワードを用語集として整理し、NotebookLMで検索・質問するときの入口にする。

## 2. 関連する記事一覧

対象記事数: ${articles.length}件。用語ごとに代表的な関連記事URLを残す。

## 3. 時系列整理

用語集は時系列ではなくキーワード別の索引である。時系列確認は \`08_timeline_index.md\` を参照する。

## 4. 主要トピック

${majorTopics(articles).map((topic) => `- ${topic}`).join("\n")}

## 5. 重要な固有名詞

${properNouns(articles).slice(0, 80).map((name) => `- ${name}`).join("\n")}

## 6. 研究室活動としての意味

用語集は、学生が「OpenStreetMap」「ドローン」「FOSS4G」「ジオ展」などの語から関連記事を横断検索するための補助資料である。各用語の意味説明は記事に明示された情報の範囲に留め、不明な定義は「不明」として扱う。

## 7. NotebookLMが回答時に参照すべき観点

- 用語の意味を説明するときは、関連する記事タイトル、公開日、著者、URLを併記する。
- 同じ用語が複数テーマにまたがる場合は、分類ラベルと公開時期を分けて説明する。
- 記事に明示されていない背景説明は推測せず、「不明」と答える。

## 用語一覧

${lines.join("\n")}
`;
}

function articleList(articles) {
  if (articles.length === 0) {
    return "該当記事なし。";
  }

  return articles
    .map((article) => `- ${article.publishedDate}: ${article.title} / 著者: ${article.author} / URL: ${article.url}`)
    .join("\n");
}

function timelineList(articles) {
  if (articles.length === 0) {
    return "該当記事なし。";
  }

  return sortByDateDesc(articles)
    .map((article) => {
      const summary = article.summary || "不明";
      return `- ${article.publishedDate}: ${article.title}。要約: ${trimTo(summary, 140)} URL: ${article.url}`;
    })
    .join("\n");
}

function majorTopics(articles) {
  const termCounts = topTerms(
    articles.flatMap((article) => [...article.tags, ...article.keywords, article.label]),
    12,
  );

  return termCounts.map((term) => `${term}に関する記事群。`);
}

function properNouns(articles) {
  const values = [];
  for (const article of articles) {
    values.push(article.author);
    values.push(...article.keywords);
    values.push(...article.tags);

    const matches = `${article.title} ${article.summary}`.match(/[A-Za-z][A-Za-z0-9&.+#-]{2,}|[一-龥ァ-ヶー]{3,}/g) || [];
    values.push(...matches);
  }

  return topTerms(values, 50);
}

function activityMeaning(articles) {
  if (articles.length === 0) {
    return "不明。該当記事がないため、研究室活動としての意味は整理できない。";
  }

  const meanings = topTerms(articles.map((article) => article.activityMeaning), 5);
  return meanings.map((meaning) => `- ${meaning}`).join("\n");
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return {};
  }

  const frontmatter = {};
  const lines = match[1].split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const scalarMatch = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!scalarMatch) {
      continue;
    }

    const [, key, rawValue] = scalarMatch;
    if (key === "tags") {
      const tags = [];
      if (rawValue.trim() === "[]") {
        frontmatter.tags = tags;
        continue;
      }

      while (lines[index + 1]?.startsWith("  - ")) {
        index += 1;
        tags.push(unquote(lines[index].replace(/^  - /, "")));
      }
      frontmatter.tags = tags;
    } else {
      frontmatter[key] = unquote(rawValue);
    }
  }

  return frontmatter;
}

function parseSections(markdown) {
  return {
    info: section(markdown, "## 1. 元記事情報"),
    summary: section(markdown, "## 2. 概要"),
    points: bulletSection(markdown, "## 3. 重要ポイント"),
    keywords: bulletSection(markdown, "## 4. 関連キーワード"),
    activityMeaning: section(markdown, "## 5. 関連する古橋研究室の活動"),
    notebookMemo: section(markdown, "## 6. NotebookLM向けメモ"),
  };
}

function section(markdown, heading) {
  const start = markdown.indexOf(heading);
  if (start < 0) {
    return "";
  }

  const contentStart = start + heading.length;
  const nextHeading = markdown.indexOf("\n## ", contentStart);
  return cleanText(markdown.slice(contentStart, nextHeading >= 0 ? nextHeading : undefined));
}

function bulletSection(markdown, heading) {
  return section(markdown, heading)
    .split("\n")
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);
}

function sectionField(info, label) {
  const match = info.match(new RegExp(`- ${escapeRegExp(label)}: ([^\\n]+)`));
  return match ? cleanText(match[1]) : "";
}

function articleMatchesTerm(article, term) {
  const haystack = [
    article.title,
    article.author,
    article.summary,
    article.label,
    ...article.tags,
    ...article.keywords,
  ].join(" ").toLowerCase();

  return haystack.includes(term.toLowerCase());
}

function topTerms(values, limit) {
  const counts = new Map();

  for (const value of values) {
    const term = cleanTerm(value);
    if (!term) {
      continue;
    }
    counts.set(term, (counts.get(term) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function cleanTerm(value) {
  const term = cleanText(value)
    .replace(/^`|`$/g, "")
    .replace(/^[・:：、。,\s]+|[・:：、。,\s]+$/g, "");

  if (!term || term === "なし" || term === "不明") {
    return "";
  }

  if (term.length > 80) {
    return "";
  }

  return term;
}

function groupBy(values, getKey) {
  const grouped = new Map();

  for (const value of values) {
    const key = getKey(value);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(value);
  }

  return grouped;
}

function sortByDateDesc(articles) {
  return [...articles].sort((left, right) =>
    String(right.publishedAt || right.publishedDate).localeCompare(String(left.publishedAt || left.publishedDate)),
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function trimTo(text, maxLength) {
  const cleaned = cleanText(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1)}…`;
}

function cleanText(value) {
  return String(value).replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function unquote(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
