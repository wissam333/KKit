import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, channelId } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();

  try {
    const entity = await client.getEntity(channelId);
    const msgs = await client.getMessages(entity, { limit: 200 });

    const byHour = Array(24).fill(0);
    const wordCount = {};
    const stopwords = new Set([
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
    ]);

    for (const msg of msgs) {
      if (!msg.message) continue;
      const d = new Date(msg.date * 1000);
      byHour[d.getHours()]++;
      msg.message
        .toLowerCase()
        .replace(/[^\u0600-\u06FFa-z\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopwords.has(w))
        .forEach((w) => {
          wordCount[w] = (wordCount[w] ?? 0) + 1;
        });
    }

    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ word, count }));

    return {
      totalMessages: msgs.length,
      byHour,
      topWords,
      peakHour: byHour.indexOf(Math.max(...byHour)),
    };
  } finally {
    await client.disconnect();
  }
});
