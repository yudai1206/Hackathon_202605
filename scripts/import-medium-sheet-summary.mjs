import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SUMMARY_CSV_FILE = path.join(ROOT_DIR, "index", "medium_sheet_articles_summary.csv");
const ARTICLES_FILE = path.join(ROOT_DIR, "raw", "rss", "articles.json");

async function main() {
  const existing = await readArticlesFile();
  const summaryRows = parseCsv(await readFile(SUMMARY_CSV_FILE, "utf8"));
  const articlesByUrl = new Map();

  for (const article of existing.articles) {
    if (!article.url) {
      continue;
    }

    articlesByUrl.set(normalizeArticleUrl(article.url), article);
  }

  let importedCount = 0;
  let updatedCount = 0;

  for (const row of summaryRows) {
    if (!row.URL) {
      continue;
    }

    const normalizedUrl = normalizeArticleUrl(row.URL);
    const summaryArticle = toArticle(row);
    const currentArticle = articlesByUrl.get(normalizedUrl);

    if (currentArticle) {
      articlesByUrl.set(normalizedUrl, mergeArticle(currentArticle, summaryArticle));
      updatedCount += 1;
    } else {
      articlesByUrl.set(normalizedUrl, summaryArticle);
      importedCount += 1;
    }
  }

  const articles = [...articlesByUrl.values()].sort((left, right) =>
    String(right.publishedAt || "").localeCompare(String(left.publishedAt || "")),
  );

  const output = {
    generatedAt: new Date().toISOString(),
    sourceFile: existing.sourceFile || "feeds/medium_feeds.txt",
    importedFrom: path.relative(ROOT_DIR, SUMMARY_CSV_FILE),
    articleCount: articles.length,
    articles,
  };

  await mkdir(path.dirname(ARTICLES_FILE), { recursive: true });
  await writeFile(ARTICLES_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Existing articles: ${existing.articles.length}`);
  console.log(`Summary rows read: ${summaryRows.length}`);
  console.log(`Imported articles: ${importedCount}`);
  console.log(`Updated articles: ${updatedCount}`);
  console.log(`Articles saved: ${articles.length}`);
  console.log(`Output: ${path.relative(ROOT_DIR, ARTICLES_FILE)}`);
}

async function readArticlesFile() {
  const rawText = await readFile(ARTICLES_FILE, "utf8").catch((error) => {
    if (error.code === "ENOENT") {
      return "";
    }

    throw error;
  });

  if (!rawText.trim()) {
    return { sourceFile: "", articles: [] };
  }

  const parsed = JSON.parse(rawText);
  return {
    sourceFile: parsed.sourceFile || "",
    articles: Array.isArray(parsed) ? parsed : parsed.articles || [],
  };
}

function toArticle(row) {
  const url = row.URL.trim();
  const tags = row["タグ"]
    .split("|")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const publishedAt = toIsoDate(row["投稿日"]);

  return {
    id: stableId(normalizeArticleUrl(url)),
    sourceFeedUrl: "",
    title: row["タイトル"].trim(),
    url,
    author: row["著者"].trim(),
    publishedAt,
    tags,
    bodyHtml: "",
    contentSource: "medium_sheet_summary",
    label: row["分類ラベル"].trim() || "other",
    summary: row["要約"].trim(),
    readingTime: row["読了時間"].trim(),
    source: row["ソース"].trim(),
  };
}

function mergeArticle(currentArticle, summaryArticle) {
  return {
    ...summaryArticle,
    ...currentArticle,
    tags: mergeTags(currentArticle.tags, summaryArticle.tags),
    label: currentArticle.label || summaryArticle.label,
    summary: currentArticle.summary || summaryArticle.summary,
    readingTime: currentArticle.readingTime || summaryArticle.readingTime,
    source: currentArticle.source || summaryArticle.source,
    contentSource: mergeContentSources(currentArticle.contentSource, summaryArticle.contentSource),
  };
}

function mergeContentSources(left = "", right = "") {
  return [...new Set([...left.split("+"), ...right.split("+")].filter(Boolean))].join("+");
}

function mergeTags(left = [], right = []) {
  return [...new Set([...left, ...right].filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...records] = rows;
  return records
    .filter((record) => record.some((value) => value.trim()))
    .map((record) =>
      Object.fromEntries(headers.map((header, index) => [header, record[index] || ""])),
    );
}

function toIsoDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function normalizeArticleUrl(url) {
  try {
    const parsedUrl = new URL(url);
    parsedUrl.hash = "";

    for (const param of [...parsedUrl.searchParams.keys()]) {
      if (param === "source" || param.startsWith("utm_")) {
        parsedUrl.searchParams.delete(param);
      }
    }

    return parsedUrl.toString();
  } catch {
    return url;
  }
}

function stableId(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
