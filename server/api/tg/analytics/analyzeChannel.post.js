// server/api/tg/analyzeChannel.post.js
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const STOPWORDS = new Set([
  // Arabic
  "في",
  "من",
  "إلى",
  "على",
  "مع",
  "هذا",
  "هذه",
  "التي",
  "الذي",
  "وقد",
  "كان",
  "عن",
  "كل",
  "قد",
  "لم",
  "لن",
  "هو",
  "هي",
  "هم",
  "أن",
  "إن",
  "عند",
  "حتى",
  "بعد",
  "قبل",
  "أو",
  "ثم",
  "لكن",
  "لأن",
  "حيث",
  "منذ",
  "خلال",
  "بين",
  "ضد",
  "نحو",
  "حول",
  "رغم",
  "مما",
  "مما",
  "كما",
  "بما",
  "لما",
  "فقد",
  "وهو",
  "وهي",
  "وهم",
  "كانت",
  "ليس",
  "غير",
  "بكل",
  "ولم",
  "ولن",
  "وكان",
  "التي",
  "الذين",
  "اللذين",
  "اللتين",
  "الذي",
  "هذان",
  // English
  "the",
  "a",
  "an",
  "is",
  "in",
  "of",
  "to",
  "and",
  "for",
  "on",
  "at",
  "by",
  "or",
  "it",
  "that",
  "this",
  "was",
  "are",
  "be",
  "as",
  "has",
  "had",
  "with",
  "not",
  "but",
  "from",
  "they",
  "we",
  "you",
  "he",
  "she",
  "its",
  "our",
  "your",
  "their",
  "been",
  "have",
  "will",
  "can",
  "all",
  "one",
  "more",
  "also",
  "than",
  "then",
  "when",
  "where",
  "which",
  "who",
  "how",
  "what",
  "about",
  "into",
  "out",
  "up",
  "no",
  "so",
  "if",
  "do",
  "did",
]);

export default defineEventHandler(async (event) => {
  const {
    apiId,
    apiHash,
    session,
    channelId,
    msgLimit = 200, // how many messages to fetch
    searchDays = 0, // 0 = all fetched msgs, >0 = filter by date
  } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();

  try {
    const limit = Math.min(Math.max(parseInt(msgLimit), 10), 1000);
    const days = parseInt(searchDays);

    const cutoff = new Date();
    if (days > 0) {
      cutoff.setDate(cutoff.getDate() - days);
      cutoff.setHours(0, 0, 0, 0);
    }

    const entity = await client.getEntity(channelId);
    const msgs = await client.getMessages(entity, { limit });

    const byHour = Array(24).fill(0);
    const byDay = {}; // yyyy-mm-dd → count
    const wordCount = {};
    let counted = 0;

    for (const msg of msgs) {
      if (!msg.message) continue;

      const d = new Date(msg.date * 1000);
      if (days > 0 && d < cutoff) continue;

      // Hour distribution
      byHour[d.getHours()]++;

      // Daily activity
      const dayKey = d.toISOString().slice(0, 10);
      byDay[dayKey] = (byDay[dayKey] ?? 0) + 1;

      // Word frequency
      msg.message
        .toLowerCase()
        .replace(/[^\u0600-\u06FFa-z\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w))
        .forEach((w) => {
          wordCount[w] = (wordCount[w] ?? 0) + 1;
        });

      counted++;
    }

    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    // Sort byDay chronologically
    const dailyActivity = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return {
      totalMessages: counted,
      byHour,
      dailyActivity,
      topWords,
      peakHour: byHour.indexOf(Math.max(...byHour)),
    };
  } finally {
    await client.disconnect();
  }
});
