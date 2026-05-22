import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const ARTICLES_DIR = path.join(ROOT_DIR, "articles");
const OUTPUT_DIR = path.join(ROOT_DIR, "articles_fulltext");
const LOGS_DIR = path.join(ROOT_DIR, "logs");
const FAILED_LOG = path.join(LOGS_DIR, "fetch_failed_articles.csv");
const CACHE_DIR = path.join(ROOT_DIR, "raw", "fulltext");
const CACHE_FILE = path.join(CACHE_DIR, "medium_fulltext_cache.json");
const RSS_FILE = path.join(ROOT_DIR, "raw", "rss", "articles.json");

const MIN_FULLTEXT_CHARS = 80;
const CONCURRENCY = Number.parseInt(process.env.FULLTEXT_CONCURRENCY || "2", 10);
const FETCH_DELAY_MS = Number.parseInt(process.env.FULLTEXT_FETCH_DELAY_MS || "350", 10);
const STOP_ON_429 = process.env.FULLTEXT_STOP_ON_429 === "1";
const OFFLINE = process.env.FULLTEXT_OFFLINE === "1";

const toolPatterns = [
  /\bOpenStreetMap\b|\bOSM\b/gi,
  /\bQGIS\b/gi,
  /\bGIS\b/gi,
  /\bMapbox\b/gi,
  /\bBlender\b/gi,
  /\bOpenDroneMap\b|\bODM\b/gi,
  /\bDRONEBIRD\b/gi,
  /ドローン/g,
  /3Dプリンター|3Dプリント|3Dモデル|3D/g,
  /\bPWA\b/gi,
  /\bGeoJSON\b/gi,
  /\bGoogle Earth\b/gi,
  /\bGoogle Earth Engine\b/gi,
  /\bJOSM\b/gi,
  /\biD Editor\b|\biDエディタ\b/gi,
  /\bMapillary\b/gi,
  /\bField Papers\b/gi,
  /\bMapSwipe\b/gi,
  /\bWheelmap\b/gi,
  /\bmaps\.me\b/gi,
  /\bPLATEAU\b/gi,
  /\bRe:Earth\b|\bRe-Earth\b/gi,
  /\bDepthmapX\b/gi,
  /\bNano Banana\b|\bNano-Banana\b/gi,
  /\bGemini\b|\bGoogle Gemini\b/gi,
  /\bGitHub\b/gi,
  /\bHTML\b/gi,
  /\bJavaScript\b/gi,
  /\bQooCam\b/gi,
  /\bGPX\b/gi,
];

const eventPatterns = [
  /ハッカソン/g,
  /週報/g,
  /\bSotM\b|\bState of the Map\b/gi,
  /\bTEDx[A-Za-z]*\b/gi,
  /ジオ展/g,
  /アドベントカレンダー/g,
  /合宿/g,
  /\bMapathon\b/gi,
  /\bMeetup\b|\bMeeting\b/gi,
  /中間発表/g,
  /卒論/g,
  /ゼミ/g,
  /防災イベント/g,
  /国際会議/g,
  /\bBUILD with Mapbox\b/gi,
  /\bFOSS4G\b/gi,
  /\bYouthMappers\b|\bYouth Mappers\b/gi,
];

const placePatterns = [
  /青山キャンパス/g,
  /青山学院大学/g,
  /相模原/g,
  /横瀬/g,
  /武甲山/g,
  /秩父/g,
  /長野県/g,
  /大町/g,
  /千年の森/g,
  /町田市/g,
  /横浜駅/g,
  /横浜/g,
  /渋谷/g,
  /福島県/g,
  /双葉郡/g,
  /楢葉町/g,
  /京都/g,
  /大阪/g,
  /バンコク/g,
  /タイ/g,
  /\bBang Krachao\b/gi,
  /\bKhao Yai\b/gi,
  /\bManila\b/gi,
  /\bBangladesh\b/gi,
  /\bIndonesia\b/gi,
  /\bIndia\b/gi,
  /\bJapan\b/gi,
  /東京/g,
  /東大/g,
  /渡邉研究室/g,
  /山中湖/g,
  /伊豆大島/g,
  /信濃大町/g,
  /セブ島/g,
];

const genericKeywordPatterns = [
  /^furuhashilab$/i,
  /^report$/i,
  /^with$/i,
  /^mapping$/i,
  /^activity$/i,
  /^article$/i,
  /^medium$/i,
  /^lab$/i,
  /^student_project$/,
  /^event_report$/,
  /^lab_overview$/,
  /^openstreetmap$/,
  /^humanitarian_mapping$/,
  /^qgis_gis_tools$/,
  /^fieldwork$/,
  /^other$/,
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d+$/,
  /^\d+[/-]\d+$/,
  /^\d+[/-]\d+[/-]\d+$/,
  /^[0-9年月日]+$/,
  /^[A-Za-z]{1,3}$/,
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return String(url || "").split("?")[0].replace(/\/$/, "");
  }
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return {};
  const lines = match[1].split("\n");
  const data = {};

  for (let index = 0; index < lines.length; index += 1) {
    const pair = lines[index].match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!pair) continue;
    const [, key, rawValue] = pair;
    const value = rawValue.trim();
    if (value === "") {
      const values = [];
      while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
        index += 1;
        values.push(lines[index].replace(/^\s+-\s+/, "").replace(/^"|"$/g, "").trim());
      }
      data[key] = values;
    } else if (value === "[]") {
      data[key] = [];
    } else if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    } else {
      data[key] = value.replace(/^"|"$/g, "");
    }
  }

  return data;
}

function yamlString(value) {
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)));
}

function htmlToParagraphs(html) {
  const normalized = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<img\b[^>]*medium\.com\/_\/stat[^>]*>/gi, "")
    .replace(/<hr[\s\S]*$/i, "");
  const matches = [...normalized.matchAll(/<(?:h[1-6]|p|li|figcaption)\b[^>]*>([\s\S]*?)<\/(?:h[1-6]|p|li|figcaption)>/gi)];
  return matches
    .map((match) => cleanText(match[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")))
    .filter((text) => text && !isBoilerplate(text));
}

function readerTextToParagraphs(markdown) {
  const content = String(markdown || "")
    .replace(/^Title:.*$/gm, "")
    .replace(/^URL Source:.*$/gm, "")
    .replace(/^Published Time:.*$/gm, "")
    .replace(/^Markdown Content:\s*/gm, "")
    .replace(/\[!\[[^\]]*]\([^)]+\)]\([^)]+\)/g, "")
    .replace(/!\[[^\]]*]\([^)]+\)/g, "")
    .replace(/\[]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1");
  return content
    .split(/\n{2,}|\r?\n/)
    .map((line) => cleanText(line.replace(/^#{1,6}\s+/, "").replace(/^[-*]\s+/, "")))
    .filter((text) => text && !isBoilerplate(text));
}

function cleanText(text) {
  return decodeHtml(text)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[>\s*]+/, "")
    .replace(/\*\*/g, "")
    .replace(/^[\s・\-–—:：]+/, "")
    .replace(/[\s]+$/, "")
    .trim();
}

function isBoilerplate(text) {
  return (
    /was originally published in/i.test(text) ||
    /where people are continuing the conversation/i.test(text) ||
    /Get .+ stories in your inbox/i.test(text) ||
    /Recommended from Medium/i.test(text) ||
    /More from .+ and/i.test(text) ||
    /^Written by\b/i.test(text) ||
    /^Follow\b/i.test(text) ||
    /^Listen\b/i.test(text) ||
    /^Share\b/i.test(text) ||
    /^Sign up\b/i.test(text) ||
    /^Join Medium for free\b/i.test(text) ||
    /^Remember me for faster sign in\b/i.test(text) ||
    /^Responses?\b/i.test(text) ||
    /^Member-only story\b/i.test(text) ||
    /^Read more\b/i.test(text) ||
    /^Press enter or click to view image in full size$/i.test(text) ||
    /^https?:\/\/\S+$/i.test(text) ||
    /^Title:/.test(text) ||
    /^URL Source:/.test(text) ||
    /^Warning:\s*Target URL returned error/i.test(text) ||
    /^Warning:\s*This page maybe requiring CAPTCHA/i.test(text) ||
    /^medium\.com$/i.test(text) ||
    /^Performing security verification$/i.test(text) ||
    /security service to protect against malicious bots/i.test(text) ||
    /displayed while the website verifies you are not a bot/i.test(text) ||
    /^Just a moment/i.test(text) ||
    /Enable JavaScript and cookies/i.test(text)
  );
}

function uniq(values) {
  const seen = new Set();
  const output = [];
  for (const value of values.map((item) => cleanText(item)).filter(Boolean)) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

function splitSentences(paragraphs) {
  return paragraphs
    .flatMap((paragraph) => paragraph.split(/(?<=[。！？!?])\s*/))
    .map(cleanText)
    .filter((sentence) => sentence.length >= 18 && sentence.length <= 220)
    .filter((sentence) => !isBoilerplate(sentence));
}

function contentUnits(paragraphs) {
  const sentences = splitSentences(paragraphs);
  const paragraphUnits = paragraphs
    .map(cleanText)
    .filter((paragraph) => paragraph.length >= 12 && paragraph.length <= 260)
    .filter((paragraph) => !isBoilerplate(paragraph));
  return uniq([...sentences, ...paragraphUnits]);
}

function matchesPattern(text, pattern) {
  pattern.lastIndex = 0;
  return pattern.test(text);
}

function selectSentences(sentences, patterns, max = 4) {
  return uniq(sentences.filter((sentence) => patterns.some((pattern) => matchesPattern(sentence, pattern)))).slice(0, max);
}

function firstContentSentences(sentences, max = 3) {
  return sentences
    .filter((sentence) => !/^(こんにちは|どうも|みなさん|お久しぶり|はじめまして)/.test(sentence))
    .filter((sentence) => /[。！？!?]$/.test(sentence))
    .filter((sentence) => !isBoilerplate(sentence))
    .slice(0, max);
}

function extractMatches(text, patterns) {
  const values = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      values.push(match[0]);
    }
  }
  return uniq(values).filter((value) => value.length >= 2);
}

function cleanKeywords(values) {
  return uniq(values)
    .map((value) => value.replace(/^#/, ""))
    .map((value) => value.replace(/^[「『【\[(]+|[」』】\])]+$/g, ""))
    .filter((value) => value.length >= 2 && value.length <= 40)
    .filter((value) => !genericKeywordPatterns.some((pattern) => pattern.test(value)))
    .filter((value) => !/^\d/.test(value))
    .filter((value) => !/^[A-Za-z]+$/.test(value) || value.length >= 4)
    .filter((value) => !/^[a-z]+$/i.test(value) || /^(OpenStreetMap|Mapbox|Blender|OpenDroneMap|DRONEBIRD|GitHub|GeoJSON|JavaScript|Mapillary|MapSwipe|Wheelmap|QGIS|GIS|ODM|PWA|HTML|GPX|SotM|TEDx|PLATEAU|FOSS4G)$/i.test(value));
}

function topicSummary(title, units, metadataOnly) {
  if (metadataOnly) {
    return `本文を取得できなかったため、記事本文に基づく概要は作成していません。タイトルは「${title}」です。`;
  }
  const selected = firstContentSentences(units, 2);
  if (selected.length > 0) return selected.join(" ");
  const paragraphs = units.slice(0, 2);
  if (paragraphs.length > 0) return paragraphs.join(" ");
  return `記事タイトルは「${title}」。本文から要約に使える説明文を抽出できませんでした。`;
}

function contentSummary(units) {
  const selected = firstContentSentences(units, 3);
  if (selected.length > 0) return selected.join(" ");
  return units.slice(0, 3).join(" ");
}

function labMeaning(units, metadataOnly) {
  if (metadataOnly) return "本文未取得のため、研究室活動としての意味は判定していません。";
  const patterns = [
    /研究室|古橋研|ゼミ|セミナー|グラレコ|学生|活動|プロジェクト|卒論|週報|ハッカソン|マッピング|地図|ドローン|防災|フィールドワーク|発表|共有|学び|制作|検証|参加/,
  ];
  const selected = selectSentences(units, patterns, 3).filter((sentence) =>
    /した|する|され|行|作|制作|参加|発表|共有|学|検証|撮影|編集|調査|まとめ|記録|取り組|使|活用|考/.test(sentence),
  );
  if (selected.length > 0) return selected.join(" ");
  const summary = contentSummary(units);
  if (summary) {
    return `本文では次の内容が記録されています。${summary} 研究室活動としての意味は本文に明示されていないため、ここでは補足していません。`;
  }
  return "本文から研究室活動としての意味を要約する根拠文を取得できませんでした。";
}

function questionExamples(title, tools, places, events, metadataOnly) {
  if (metadataOnly) {
    return [
      `この記事「${title}」の元記事URL、著者、公開日は何ですか。`,
      `この記事はどの分類ラベル・タグに整理されていますか。`,
    ];
  }
  const questions = [
    `この記事では何を行い、どのような学びや成果が記録されていますか。`,
    `この記事の著者、公開日、元記事URLは何ですか。`,
  ];
  if (tools.length > 0) questions.push(`この記事で使われた、または言及されたツール・技術は何ですか。`);
  if (places.length > 0) questions.push(`この記事に登場する場所はどこですか。`);
  if (events.length > 0) questions.push(`この記事に関係するイベントや活動名は何ですか。`);
  return questions.slice(0, 5);
}

function listMarkdown(values, fallback = "なし") {
  const items = uniq(values).filter(Boolean);
  if (items.length === 0) return `- ${fallback}`;
  return items.map((item) => `- ${item}`).join("\n");
}

function buildMarkdown({ meta, source, paragraphs, quality }) {
  const text = paragraphs.join("\n");
  const sentences = splitSentences(paragraphs);
  const units = contentUnits(paragraphs);
  const metadataOnly = quality === "metadata_only";
  const tools = metadataOnly ? [] : extractMatches(text, toolPatterns);
  const events = metadataOnly ? [] : extractMatches(`${meta.title}\n${text}`, eventPatterns);
  const places = metadataOnly ? [] : extractMatches(text, placePatterns);
  const actionSentences = metadataOnly
    ? []
    : selectSentences(units, [/行いました|行った|作成|制作|参加|発表|検証|調査|まとめ|学び|挑戦|実装|構築|撮影|編集|マッピング|開拓|処理|動かして|使って|比較|分析/], 5);
  const important = metadataOnly
    ? ["本文を取得できなかったため、本文に基づく重要ポイントは作成していません。"]
    : uniq([...actionSentences, ...firstContentSentences(units, 3), ...units.slice(0, 3)]).slice(0, 7);
  const keywords = cleanKeywords([
    ...(meta.tags || []),
    meta.label,
    ...tools,
    ...events,
    ...places,
    ...meta.title.split(/[、。・\s\[\]【】「」『』!！?？:：()（）\-]+/),
  ]);

  return `---
title: ${yamlString(meta.title)}
author: ${yamlString(meta.author)}
published_at: ${yamlString((meta.published_at || "").slice(0, 10))}
url: ${yamlString(meta.url)}
label: ${yamlString(meta.label)}
tags: [${(meta.tags || []).map(yamlString).join(", ")}]
summary_quality: ${yamlString(quality)}
fulltext_source: ${yamlString(source)}
---

# ${meta.title}

## 概要

${topicSummary(meta.title, units, metadataOnly)}

## 重要ポイント

${listMarkdown(important)}

## 研究室活動としての意味

${labMeaning(units, metadataOnly)}

## 関連する人物・イベント・ツール・地名

### 人物

${listMarkdown([meta.author])}

### イベント

${listMarkdown(events)}

### ツール・技術

${listMarkdown(tools)}

### 地名

${listMarkdown(places)}

## NotebookLMで答えられる質問例

${listMarkdown(questionExamples(meta.title, tools, places, events, metadataOnly))}

## 抽出キーワード

${listMarkdown(keywords)}

## 元記事URL

${meta.url}
`;
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function fetchViaReader(url) {
  const normalized = normalizeUrl(url);
  const readerUrl = `https://r.jina.ai/${normalized}`;
  const response = await fetch(readerUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; NotebookLMSourceBuilder/0.1)",
      accept: "text/plain, text/markdown, */*",
    },
    redirect: "follow",
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const paragraphs = readerTextToParagraphs(text);
  if (paragraphs.join("").length < MIN_FULLTEXT_CHARS) {
    throw new Error("reader_text_too_short");
  }
  return { paragraphs, rawLength: text.length };
}

function errorReason(error) {
  const messages = [];
  let current = error;
  while (current && messages.length < 3) {
    if (current.message && !messages.includes(current.message)) {
      messages.push(current.message);
    }
    if (current.code && !messages.includes(current.code)) {
      messages.push(current.code);
    }
    current = current.cause;
  }
  return messages.join(": ") || String(error);
}

async function processOne({ file, meta, rssArticle, cache, fetchState }) {
  const normalizedUrl = normalizeUrl(meta.url);
  let quality = "metadata_only";
  let source = "metadata_only";
  let paragraphs = [];
  let failure = "";

  const cached = cache[normalizedUrl];
  const cachedParagraphs = (cached?.paragraphs || []).filter((paragraph) => !isBoilerplate(paragraph));
  if (cachedParagraphs.join("").length >= MIN_FULLTEXT_CHARS) {
    paragraphs = cachedParagraphs;
    source = cached.source || "reader_cache";
    quality = "full_text_reviewed";
  } else if (fetchState.rateLimited || OFFLINE) {
    failure = fetchState.rateLimited ? "rate_limit_stopped" : "no_valid_cached_fulltext";
  } else {
    try {
      const fetched = await fetchViaReader(meta.url);
      paragraphs = fetched.paragraphs;
      source = "medium_url_reader";
      quality = "full_text_reviewed";
      cache[normalizedUrl] = {
        source,
        fetchedAt: new Date().toISOString(),
        paragraphs,
      };
    } catch (error) {
      failure = errorReason(error);
      if (STOP_ON_429 && failure === "HTTP 429") {
        fetchState.rateLimited = true;
      }
      const rssParagraphs = htmlToParagraphs(rssArticle?.bodyHtml || "");
      if (rssParagraphs.join("").length >= MIN_FULLTEXT_CHARS) {
        paragraphs = rssParagraphs;
        source = "medium_rss_bodyHtml";
        quality = "full_text_reviewed";
        cache[normalizedUrl] = {
          source,
          fetchedAt: new Date().toISOString(),
          paragraphs,
        };
      }
    } finally {
      await sleep(FETCH_DELAY_MS);
    }
  }

  const markdown = buildMarkdown({ meta, source, paragraphs, quality });
  await writeFile(path.join(OUTPUT_DIR, file), markdown, "utf8");

  if (quality === "metadata_only") {
    return {
      file,
      title: meta.title,
      url: meta.url,
      reason: failure || "no_fulltext_available",
    };
  }
  return null;
}

async function runQueue(items, worker) {
  const results = [];
  let index = 0;
  const runners = Array.from({ length: CONCURRENCY }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await worker(current));
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(LOGS_DIR, { recursive: true });
  await mkdir(CACHE_DIR, { recursive: true });

  const rssData = await readJson(RSS_FILE, { articles: [] });
  const rssArticles = Array.isArray(rssData) ? rssData : rssData.articles || [];
  const rssByUrl = new Map(rssArticles.map((article) => [normalizeUrl(article.url), article]));
  const cache = await readJson(CACHE_FILE, {});
  const fetchState = { rateLimited: false };

  const files = (await readdir(ARTICLES_DIR)).filter((file) => file.endsWith(".md")).sort();
  const items = [];
  for (const file of files) {
    const markdown = await readFile(path.join(ARTICLES_DIR, file), "utf8");
    const data = parseFrontmatter(markdown);
    const meta = {
      title: data.title || file.replace(/\.md$/, ""),
      author: data.author || "不明",
      published_at: data.published_at || "",
      url: data.url || "",
      label: data.label || "不明",
      tags: Array.isArray(data.tags) ? data.tags : [],
    };
    items.push({
      file,
      meta,
      rssArticle: rssByUrl.get(normalizeUrl(meta.url)),
      cache,
      fetchState,
    });
  }

  const failures = (await runQueue(items, processOne)).filter(Boolean);
  await writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, "utf8");

  const csvRows = [
    "file,title,url,reason",
    ...failures.map((item) =>
      [item.file, item.title, item.url, item.reason]
        .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  await writeFile(FAILED_LOG, `${csvRows.join("\n")}\n`, "utf8");

  console.log(`Articles processed: ${items.length}`);
  console.log(`Full text reviewed: ${items.length - failures.length}`);
  console.log(`Metadata only: ${failures.length}`);
  console.log(`Rate limit stopped: ${fetchState.rateLimited}`);
  console.log(`Output: ${path.relative(ROOT_DIR, OUTPUT_DIR)}`);
  console.log(`Failure log: ${path.relative(ROOT_DIR, FAILED_LOG)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
