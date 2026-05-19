import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const FEEDS_FILE = path.join(ROOT_DIR, "feeds", "medium_feeds.txt");
const OUTPUT_FILE = path.join(ROOT_DIR, "raw", "rss", "articles.json");
const ERROR_LOG_FILE = path.join(ROOT_DIR, "logs", "fetch_errors.log");

const USER_AGENT =
  "furuhashi-lab-notebooklm-rss-source-builder/0.1 (+https://github.com/)";

async function main() {
  await ensureDirectories();

  const feedUrls = await readFeedUrls();
  const existingArticles = await readExistingArticles();
  const articlesByUrl = new Map(
    existingArticles
      .filter((article) => article && typeof article.url === "string")
      .map((article) => [normalizeArticleUrl(article.url), article]),
  );

  const errors = [];

  for (const feedUrl of feedUrls) {
    try {
      const xml = await fetchFeedXml(feedUrl);
      const parsedArticles = parseFeed(xml, feedUrl);

      for (const article of parsedArticles) {
        if (!article.url) {
          continue;
        }

        const normalizedUrl = normalizeArticleUrl(article.url);
        if (!articlesByUrl.has(normalizedUrl)) {
          articlesByUrl.set(normalizedUrl, article);
        }
      }
    } catch (error) {
      errors.push({ feedUrl, error });
    }
  }

  if (errors.length > 0) {
    await appendErrorLog(errors);
  }

  const articles = [...articlesByUrl.values()].sort((left, right) =>
    String(right.publishedAt || "").localeCompare(String(left.publishedAt || "")),
  );

  const output = {
    generatedAt: new Date().toISOString(),
    sourceFile: path.relative(ROOT_DIR, FEEDS_FILE),
    articleCount: articles.length,
    articles,
  };

  await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`Feeds read: ${feedUrls.length}`);
  console.log(`Articles saved: ${articles.length}`);
  console.log(`Fetch errors: ${errors.length}`);
  console.log(`Output: ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}

async function ensureDirectories() {
  await mkdir(path.dirname(FEEDS_FILE), { recursive: true });
  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await mkdir(path.dirname(ERROR_LOG_FILE), { recursive: true });
}

async function readFeedUrls() {
  const rawText = await readFile(FEEDS_FILE, "utf8").catch((error) => {
    if (error.code === "ENOENT") {
      return "";
    }

    throw error;
  });

  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

async function readExistingArticles() {
  const rawText = await readFile(OUTPUT_FILE, "utf8").catch((error) => {
    if (error.code === "ENOENT") {
      return "";
    }

    throw error;
  });

  if (!rawText.trim()) {
    return [];
  }

  const parsed = JSON.parse(rawText);
  return Array.isArray(parsed) ? parsed : parsed.articles || [];
}

async function fetchFeedXml(feedUrl) {
  const response = await fetch(feedUrl, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!/xml|rss|atom|text\/plain|text\/html/i.test(contentType)) {
    throw new Error(`Unexpected content-type: ${contentType || "(none)"}`);
  }

  return response.text();
}

function parseFeed(xml, sourceFeedUrl) {
  const itemBlocks = extractBlocks(xml, "item");
  const entryBlocks = extractBlocks(xml, "entry");
  const blocks = itemBlocks.length > 0 ? itemBlocks : entryBlocks;

  return blocks
    .map((block) => parseArticleBlock(block, sourceFeedUrl))
    .filter((article) => article.title || article.url);
}

function parseArticleBlock(block, sourceFeedUrl) {
  const url =
    decodeEntities(getAtomLink(block)) ||
    decodeEntities(getTagText(block, "link")) ||
    decodeEntities(getTagText(block, "guid"));
  const normalizedUrl = url ? normalizeArticleUrl(url) : "";

  const bodyHtml =
    getTagText(block, "content:encoded") ||
    getTagText(block, "content") ||
    getTagText(block, "summary") ||
    getTagText(block, "description") ||
    "";

  return {
    id: stableId(normalizedUrl || `${sourceFeedUrl}:${getTagText(block, "title")}`),
    sourceFeedUrl,
    title: decodeEntities(getTagText(block, "title")),
    url,
    author:
      decodeEntities(getTagText(block, "dc:creator")) ||
      decodeEntities(getTagText(block, "author")) ||
      decodeEntities(getTagText(block, "name")),
    publishedAt:
      toIsoDate(getTagText(block, "pubDate")) ||
      toIsoDate(getTagText(block, "published")) ||
      toIsoDate(getTagText(block, "updated")),
    tags: getTags(block),
    bodyHtml,
    contentSource: "rss",
  };
}

function extractBlocks(xml, tagName) {
  const escapedTagName = escapeRegExp(tagName);
  const pattern = new RegExp(`<${escapedTagName}\\b[^>]*>[\\s\\S]*?<\\/${escapedTagName}>`, "gi");
  return xml.match(pattern) || [];
}

function getTagText(xml, tagName) {
  const escapedTagName = escapeRegExp(tagName);
  const pattern = new RegExp(`<${escapedTagName}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTagName}>`, "i");
  const match = xml.match(pattern);

  if (!match) {
    return "";
  }

  return unwrapCdata(match[1]).trim();
}

function getAllTagTexts(xml, tagName) {
  const escapedTagName = escapeRegExp(tagName);
  const pattern = new RegExp(`<${escapedTagName}\\b([^>]*)>([\\s\\S]*?)<\\/${escapedTagName}>`, "gi");
  const values = [];
  let match;

  while ((match = pattern.exec(xml)) !== null) {
    const attrValue = getAttribute(match[1], "term");
    values.push(unwrapCdata(attrValue || match[2]).trim());
  }

  return values.filter(Boolean);
}

function getAtomLink(xml) {
  const linkPattern = /<link\b([^>]*)\/?>/gi;
  let match;

  while ((match = linkPattern.exec(xml)) !== null) {
    const attributes = match[1];
    const rel = getAttribute(attributes, "rel");
    const href = getAttribute(attributes, "href");

    if (href && (!rel || rel === "alternate")) {
      return href;
    }
  }

  return "";
}

function getTags(xml) {
  const tags = [
    ...getAllTagTexts(xml, "category"),
    ...getAllTagTexts(xml, "dc:subject"),
  ].map(decodeEntities);

  return [...new Set(tags)].sort((left, right) => left.localeCompare(right));
}

function getAttribute(attributes, name) {
  const pattern = new RegExp(`${escapeRegExp(name)}=["']([^"']*)["']`, "i");
  const match = attributes.match(pattern);
  return match ? decodeEntities(match[1]).trim() : "";
}

function unwrapCdata(value) {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeEntities(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function toIsoDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(decodeEntities(value));
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function appendErrorLog(errors) {
  const lines = errors.map(({ feedUrl, error }) =>
    JSON.stringify({
      at: new Date().toISOString(),
      feedUrl,
      message: error instanceof Error ? error.message : String(error),
    }),
  );

  await appendFile(ERROR_LOG_FILE, `${lines.join("\n")}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
