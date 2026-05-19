import { mkdir, readdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const INPUT_FILE = path.join(ROOT_DIR, "raw", "articles.json");
const FALLBACK_INPUT_FILE = path.join(ROOT_DIR, "raw", "rss", "articles.json");
const OUTPUT_DIR = path.join(ROOT_DIR, "articles");

const ACTIVITY_BY_LABEL = {
  lab_overview: "古橋研究室の活動紹介、研究室運営、広報、チーム活動の記録。",
  openstreetmap: "OpenStreetMap、YouthMappers、地図編集、オープンマッピングに関する活動。",
  humanitarian_mapping: "災害対応、人道支援、クライシスマッピング、社会課題解決型マッピングに関する活動。",
  foss4g_sotm: "FOSS4G、State of the Map、OSGeoなどのオープンソースGISコミュニティ活動。",
  qgis_gis_tools: "QGIS、GIS、ドローン、ODM、3Dモデル、地理空間ツールの実践・検証活動。",
  student_project: "学生プロジェクト、週報、卒業研究、ゼミ活動、チーム制作に関する活動。",
  event_report: "ジオ展、勉強会、ワークショップ、発表、イベント参加報告に関する活動。",
  fieldwork: "フィールドワーク、現地調査、地域連携、実地での観察・制作活動。",
  education: "授業、講義、教材、演習、学習プロセスの共有に関する活動。",
  other: "古橋研究室周辺の活動記録。分類が明確でないため、タイトル・タグ・概要から個別に参照する。",
};

const LABELS = Object.keys(ACTIVITY_BY_LABEL);

const LABEL_RULES = [
  {
    label: "humanitarian_mapping",
    keywords: ["hotosm", "humanitarian", "disaster", "災害", "防災", "減災", "人道支援", "クライシス", "crisis", "マパソン", "マッパソン"],
  },
  {
    label: "openstreetmap",
    keywords: ["openstreetmap", "osm", "オープンストリートマップ", "地図", "mapping", "mapper", "mappers", "youthmappers", "youth mappers"],
  },
  {
    label: "foss4g_sotm",
    keywords: ["foss4g", "sotm", "state of the map", "osgeo"],
  },
  {
    label: "qgis_gis_tools",
    keywords: ["qgis", "gis", "geopandas", "postgis", "leaflet", "maplibre", "opendronemap", "odm", "drone", "ドローン", "地理情報", "空間情報"],
  },
  {
    label: "fieldwork",
    keywords: ["フィールドワーク", "現地調査", "巡検", "調査", "横瀬", "大町", "ツリーハウス", "fieldwork", "survey"],
  },
  {
    label: "education",
    keywords: ["授業", "講義", "教材", "教育", "演習", "ゼミ", "tutorial", "education", "learning"],
  },
  {
    label: "event_report",
    keywords: ["イベント", "開催", "参加", "登壇", "講演", "勉強会", "ワークショップ", "conference", "seminar", "meetup", "ジオ展", "レポート"],
  },
  {
    label: "student_project",
    keywords: ["卒論", "修論", "卒業研究", "学生", "週報", "project", "student", "チーム", "班", "部", "グラレコ"],
  },
  {
    label: "lab_overview",
    keywords: ["古橋研究室", "古橋研", "furuhashilab", "furuhashi lab", "研究室", "メンバー", "活動紹介"],
  },
];

async function main() {
  const inputFile = await resolveInputFile();
  const data = JSON.parse(await readFile(inputFile, "utf8"));
  const articles = Array.isArray(data) ? data : data.articles || [];

  await resetOutputDirectory();

  let writtenCount = 0;
  for (const [index, article] of articles.entries()) {
    const filename = `${String(index + 1).padStart(4, "0")}-${slugify(article.title || article.id || "article")}.md`;
    const markdown = toMarkdown(article, path.relative(ROOT_DIR, inputFile));
    await writeFile(path.join(OUTPUT_DIR, filename), markdown, "utf8");
    writtenCount += 1;
  }

  console.log(`Input: ${path.relative(ROOT_DIR, inputFile)}`);
  console.log(`Articles read: ${articles.length}`);
  console.log(`Markdown files written: ${writtenCount}`);
  console.log(`Output directory: ${path.relative(ROOT_DIR, OUTPUT_DIR)}`);
}

async function resolveInputFile() {
  try {
    await readFile(INPUT_FILE, "utf8");
    return INPUT_FILE;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  return FALLBACK_INPUT_FILE;
}

async function resetOutputDirectory() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const entry of await readdir(OUTPUT_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      await rm(path.join(OUTPUT_DIR, entry.name));
    }
  }
}

function toMarkdown(article, sourceFile) {
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const bodyText = htmlToText(article.bodyHtml || "");
  const label = LABELS.includes(article.label) ? article.label : classifyArticle(article, bodyText);
  const summary = summarize(article, bodyText);
  const points = importantPoints(article, bodyText, summary);
  const keywords = relatedKeywords(article, bodyText, label);
  const activity = ACTIVITY_BY_LABEL[label] || ACTIVITY_BY_LABEL.other;
  const notebookMemo = notebookLmMemo(article, label, keywords);

  return `---
id: ${yamlString(article.id || "")}
title: ${yamlString(article.title || "")}
url: ${yamlString(article.url || "")}
author: ${yamlString(article.author || "")}
published_at: ${yamlString(article.publishedAt || "")}
label: ${yamlString(label)}
tags:${tags.length > 0 ? `\n${tags.map((tag) => `  - ${yamlString(tag)}`).join("\n")}` : " []"}
source_file: ${yamlString(sourceFile)}
content_source: ${yamlString(article.contentSource || "")}
---

# ${article.title || "Untitled"}

## 1. 元記事情報

- タイトル: ${article.title || ""}
- 著者: ${article.author || ""}
- 公開日: ${formatDate(article.publishedAt)}
- URL: ${article.url || ""}
- 分類ラベル: \`${label}\`
- タグ: ${tags.length > 0 ? tags.map((tag) => `\`${tag}\``).join(", ") : "なし"}

## 2. 概要

${summary}

## 3. 重要ポイント

${points.map((point) => `- ${point}`).join("\n")}

## 4. 関連キーワード

${keywords.map((keyword) => `- ${keyword}`).join("\n")}

## 5. 関連する古橋研究室の活動

${activity}

## 6. NotebookLM向けメモ

${notebookMemo}
`;
}

function summarize(article, bodyText) {
  const sourceSummary = cleanText(article.summary || "");
  if (sourceSummary) {
    return normalizeSummary(sourceSummary, article);
  }

  const sentences = splitSentences(bodyText)
    .filter((sentence) => !isMediumBoilerplate(sentence))
    .filter((sentence) => !isLowSignalSentence(sentence));
  if (sentences.length > 0) {
    return normalizeSummary(sentences.slice(0, 2).join(" "), article);
  }

  const title = article.title || "この記事";
  const label = article.label || "other";
  return `${title}について、古橋研究室の活動記録として整理した記事。分類は${label}で、NotebookLMではタイトル、著者、日付、タグを手がかりに参照できる。`;
}

function normalizeSummary(summary, article) {
  const text = stripLeadingPunctuation(splitSentences(summary).slice(0, 2).join(" ") || cleanText(summary));
  const title = article.title || "";

  if (text.length >= 20) {
    return text;
  }

  return `${title}に関する短い活動記録。${text}`.trim();
}

function importantPoints(article, bodyText, summary) {
  const title = article.title || "";
  const label = article.label || "other";
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const candidates = splitSentences(bodyText)
    .filter((sentence) => !isMediumBoilerplate(sentence))
    .filter((sentence) => !isLowSignalSentence(sentence))
    .filter((sentence) => sentence.length >= 18)
    .slice(0, 4);

  const points = [];
  points.push(`${formatDate(article.publishedAt) || "日付未設定"}に公開された「${title}」の記録。`);

  if (summary) {
    points.push(`主題は「${trimTo(summary, 90)}」。`);
  }

  for (const sentence of candidates) {
    if (points.length >= 5) {
      break;
    }
    points.push(trimTo(sentence, 110));
  }

  if (tags.length > 0) {
    points.push(`タグとして ${tags.slice(0, 5).join("、")} が付与されている。`);
  }

  points.push(`分類ラベルは ${label}。NotebookLMでは同じ分類の記事と比較しやすい。`);

  return unique(points).slice(0, 5);
}

function relatedKeywords(article, bodyText, label) {
  const tags = Array.isArray(article.tags) ? article.tags : [];
  const titleKeywords = extractKeywords(article.title || "");
  const bodyKeywords = extractKeywords(`${article.summary || ""} ${bodyText}`).slice(0, 6);
  const date = formatDate(article.publishedAt);

  return unique([
    label,
    ...tags,
    ...titleKeywords,
    ...bodyKeywords,
    article.author,
    date,
  ].filter(Boolean)).slice(0, 12);
}

function notebookLmMemo(article, label, keywords) {
  const title = article.title || "";
  const author = article.author || "";
  const publishedDate = formatDate(article.publishedAt);
  const keywordText = keywords.slice(0, 6).join("、");

  return [
    `検索時は「${title}」「${author}」「${publishedDate}」「${label}」を主要な手がかりにする。`,
    `関連調査では、${keywordText || "記事タイトルと分類ラベル"}をキーワードとして、同じ分類の記事や近い日付の週報と照合するとよい。`,
    "本文HTMLがない記事は、シート由来の概要・タグ・メタデータをもとにした要約として扱う。",
  ].join("\n\n");
}

function classifyArticle(article, bodyText) {
  const haystack = [
    article.title,
    article.author,
    article.summary,
    ...(Array.isArray(article.tags) ? article.tags : []),
    bodyText.slice(0, 4000),
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
  return scores[0].label;
}

function htmlToText(html) {
  return decodeEntities(
    String(html)
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(p|div|h[1-6]|li|blockquote|figure|ol|ul)>/gi, "。 ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function splitSentences(text) {
  const cleaned = cleanText(text);
  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(/(?<=[。！？!?])\s*|(?<=\.)\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isMediumBoilerplate(sentence) {
  return /was originally published in|on Medium|people are continuing the conversation|clientViewed/i.test(sentence);
}

function isLowSignalSentence(sentence) {
  const text = sentence.trim();
  return /^(こんにちは|はじめまして|よろしくお願いします|以上です)$/u.test(text)
    || /^こんにちは。?$/u.test(text)
    || /^[^。！？!?]{1,20}です。?$/u.test(text);
}

function extractKeywords(text) {
  const cleaned = cleanText(text)
    .replace(/[()[\]【】「」『』。、，,.!?！？:：/\\|]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .filter((word) => word.length <= 32)
    .filter((word) => !["こんにちは", "はじめまして", "よろしくお願いします"].includes(word))
    .filter((word) => !isLowSignalSentence(word))
    .filter((word) => !/^\d+$/.test(word));

  return unique(cleaned).slice(0, 8);
}

function cleanText(value) {
  return decodeEntities(String(value)).replace(/\s+/g, " ").trim();
}

function stripLeadingPunctuation(value) {
  return cleanText(value).replace(/^[。！？!?、，,\s]+/u, "");
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
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function trimTo(text, maxLength) {
  const cleaned = cleanText(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 1)}…`;
}

function unique(values) {
  return [...new Set(values.map((value) => cleanText(value)).filter(Boolean))];
}

function countOccurrences(text, keyword) {
  if (!keyword) {
    return 0;
  }

  return text.split(keyword).length - 1;
}

function yamlString(value) {
  return JSON.stringify(String(value ?? ""));
}

function slugify(value) {
  const slug = String(value)
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|#%{}^~[\]`;\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "article";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
