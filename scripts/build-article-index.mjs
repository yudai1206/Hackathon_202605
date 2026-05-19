import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ARTICLES_FILE = path.join(ROOT_DIR, "raw", "rss", "articles.json");
const INDEX_DIR = path.join(ROOT_DIR, "index");
const CSV_FILE = path.join(INDEX_DIR, "articles_index.csv");
const MARKDOWN_FILE = path.join(INDEX_DIR, "articles_index.md");

const LABELS = [
  "lab_overview",
  "openstreetmap",
  "humanitarian_mapping",
  "foss4g_sotm",
  "qgis_gis_tools",
  "student_project",
  "event_report",
  "fieldwork",
  "education",
  "other",
];

const LABEL_RULES = [
  {
    label: "humanitarian_mapping",
    keywords: [
      "hotosm",
      "humanitarian",
      "disaster",
      "災害",
      "防災",
      "減災",
      "人道支援",
      "クライシスマッピング",
      "crisis mapping",
    ],
  },
  {
    label: "openstreetmap",
    keywords: [
      "openstreetmap",
      "osm",
      "mapathon",
      "マッパソン",
      "マッピングパーティ",
      "地図",
    ],
  },
  {
    label: "foss4g_sotm",
    keywords: [
      "foss4g",
      "state of the map",
      "sotm",
      "osgeo",
      "オープンソースgis",
    ],
  },
  {
    label: "qgis_gis_tools",
    keywords: [
      "qgis",
      "gis",
      "geopandas",
      "postgis",
      "leaflet",
      "maplibre",
      "地理情報システム",
      "空間情報",
    ],
  },
  {
    label: "student_project",
    keywords: [
      "卒論",
      "修論",
      "卒業研究",
      "学生",
      "ゼミ",
      "研究発表",
      "project",
      "student",
    ],
  },
  {
    label: "event_report",
    keywords: [
      "イベント",
      "開催",
      "参加",
      "登壇",
      "講演",
      "勉強会",
      "ワークショップ",
      "conference",
      "seminar",
      "meetup",
    ],
  },
  {
    label: "fieldwork",
    keywords: [
      "フィールドワーク",
      "現地調査",
      "巡検",
      "調査",
      "fieldwork",
      "survey",
    ],
  },
  {
    label: "education",
    keywords: [
      "授業",
      "講義",
      "教材",
      "教育",
      "演習",
      "tutorial",
      "education",
      "learning",
    ],
  },
  {
    label: "lab_overview",
    keywords: [
      "古橋研究室",
      "研究室",
      "furuhashi lab",
      "lab",
      "メンバー",
      "活動紹介",
    ],
  },
];

async function main() {
  await mkdir(INDEX_DIR, { recursive: true });

  const source = await readArticlesSource();
  const articles = source.articles
    .map(toIndexRow)
    .sort((left, right) =>
      String(right.publishedAt || "").localeCompare(String(left.publishedAt || "")),
    );

  await writeFile(CSV_FILE, toCsv(articles), "utf8");
  await writeFile(MARKDOWN_FILE, toMarkdown(articles, source.generatedAt), "utf8");

  console.log(`Articles indexed: ${articles.length}`);
  console.log(`CSV: ${path.relative(ROOT_DIR, CSV_FILE)}`);
  console.log(`Markdown: ${path.relative(ROOT_DIR, MARKDOWN_FILE)}`);
}

async function readArticlesSource() {
  const rawText = await readFile(ARTICLES_FILE, "utf8");
  const parsed = JSON.parse(rawText);
  const articles = Array.isArray(parsed) ? parsed : parsed.articles || [];

  return {
    generatedAt: parsed.generatedAt || "",
    articles: articles.filter((article) => article && typeof article === "object"),
  };
}

function toIndexRow(article) {
  const plainText = htmlToText(article.bodyHtml || "");
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const label = LABELS.includes(article.label) ? article.label : classifyArticle(article, plainText);

  return {
    id: article.id || "",
    title: cleanText(article.title || ""),
    url: article.url || "",
    author: cleanText(article.author || ""),
    publishedAt: article.publishedAt || "",
    publishedDate: formatDate(article.publishedAt),
    tags,
    label,
    summary: cleanText(article.summary || "") || summarizeArticle(article, plainText, label),
  };
}

function classifyArticle(article, plainText) {
  const haystack = [
    article.title,
    article.author,
    article.summary,
    ...(Array.isArray(article.tags) ? article.tags : []),
    plainText.slice(0, 4000),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scores = LABEL_RULES.map((rule) => ({
    label: rule.label,
    score: rule.keywords.reduce(
      (total, keyword) => total + countOccurrences(haystack, keyword.toLowerCase()),
      0,
    ),
  })).filter((result) => result.score > 0);

  if (scores.length === 0) {
    return "other";
  }

  scores.sort((left, right) => right.score - left.score);
  return LABELS.includes(scores[0].label) ? scores[0].label : "other";
}

function summarizeArticle(article, plainText, label) {
  const sentences = splitSentences(plainText);
  const selectedSentences = sentences.slice(0, 2);

  if (selectedSentences.length > 0) {
    return selectedSentences.join(" ");
  }

  const title = cleanText(article.title || "この記事");
  const tags = Array.isArray(article.tags) && article.tags.length > 0
    ? `タグは${article.tags.slice(0, 3).join("、")}です。`
    : "";

  return `${title}に関する記事です。分類ラベルは${label}です。${tags}`.trim();
}

function splitSentences(text) {
  const normalized = cleanText(text);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/(?<=[。！？!?])\s+|(?<=[。！？!?])/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 12)
    .slice(0, 2);
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li|blockquote|figure)>/gi, "。 ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function cleanText(value) {
  return decodeEntities(String(value)).replace(/\s+/g, " ").trim();
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function countOccurrences(text, keyword) {
  if (!keyword) {
    return 0;
  }

  return text.split(keyword).length - 1;
}

function toCsv(rows) {
  const columns = [
    "id",
    "title",
    "url",
    "author",
    "publishedAt",
    "publishedDate",
    "tags",
    "label",
    "summary",
  ];

  const lines = [
    columns.join(","),
    ...rows.map((row) =>
      columns
        .map((column) => csvEscape(column === "tags" ? row.tags.join("|") : row[column]))
        .join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function toMarkdown(rows, sourceGeneratedAt) {
  const lines = [
    "# Articles Index",
    "",
    `- Source: raw/rss/articles.json`,
    `- Source generated at: ${sourceGeneratedAt || "unknown"}`,
    `- Index generated at: ${new Date().toISOString()}`,
    `- Article count: ${rows.length}`,
    "",
  ];

  if (rows.length === 0) {
    lines.push("No articles found. Add RSS URLs to `feeds/medium_feeds.txt`, run `npm run fetch:rss`, then run `npm run build:index`.");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  for (const row of rows) {
    lines.push(`## ${escapeMarkdown(row.title || "(untitled)")}`);
    lines.push("");
    lines.push(`- URL: ${row.url ? `[${escapeMarkdown(row.url)}](${row.url})` : ""}`);
    lines.push(`- Author: ${escapeMarkdown(row.author)}`);
    lines.push(`- Published: ${row.publishedDate || row.publishedAt}`);
    lines.push(`- Label: \`${row.label}\``);
    lines.push(`- Tags: ${row.tags.map((tag) => `\`${escapeMarkdown(tag)}\``).join(", ")}`);
    lines.push(`- Summary: ${escapeMarkdown(row.summary)}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function escapeMarkdown(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
