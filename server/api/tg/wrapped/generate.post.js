import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

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
  "قال",
  "كل",
  "هو",
  "هي",
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
  "have",
  "has",
  "been",
  "will",
  "with",
  "you",
  "me",
  "my",
  "we",
  "our",
  "i",
  "he",
  "she",
  "they",
]);

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, period, locale } = await readBody(event);
  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    cutoff.setHours(0, 0, 0, 0);

    const me = await client.getMe();
    const myId = me.id?.toString();
    const myName =
      [me.firstName, me.lastName].filter(Boolean).join(" ") ||
      me.username ||
      "You";

    const dialogs = await client.getDialogs({ limit: 200 });
    const privateDialogs = dialogs.filter((d) => !d.isChannel && !d.isGroup);
    const channelsRead = dialogs.filter((d) => d.isChannel || d.isGroup).length;

    let totalSent = 0,
      totalReceived = 0,
      mediaSent = 0;
    const activeDays = new Set();
    const byHour = Array(24).fill(0);
    const contactMap = {};
    const wordCount = {};
    const dayMap = {};

    for (const dialog of privateDialogs) {
      try {
        const msgs = await client.getMessages(dialog.entity, { limit: 100 });
        const peer = dialog.title || dialog.name || "Unknown";
        for (const msg of msgs) {
          if (!msg.message && !msg.media) continue;
          const msgDate = new Date(msg.date * 1000);
          if (msgDate < cutoff) continue;
          const h = msgDate.getHours();
          const dayKey = msgDate.toLocaleDateString("en-GB");
          byHour[h]++;
          activeDays.add(dayKey);
          dayMap[dayKey] = (dayMap[dayKey] ?? 0) + 1;
          if (msg.out) {
            totalSent++;
            if (msg.media) mediaSent++;
            if (msg.message) {
              msg.message
                .toLowerCase()
                .replace(/[^\u0600-\u06FFa-z\s]/g, " ")
                .split(/\s+/)
                .filter((w) => w.length > 3 && !stopwords.has(w))
                .forEach((w) => {
                  wordCount[w] = (wordCount[w] ?? 0) + 1;
                });
            }
          } else {
            totalReceived++;
            contactMap[peer] = (contactMap[peer] ?? 0) + 1;
          }
        }
      } catch {
        /* skip */
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    const peakHour = byHour.indexOf(Math.max(...byHour));
    const topContacts = Object.entries(contactMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));
    const mostActiveDayEntry = Object.entries(dayMap).sort(
      (a, b) => b[1] - a[1],
    )[0];

    return {
      myName,
      totalSent,
      totalReceived,
      mediaSent,
      activeDays: activeDays.size,
      channelsRead,
      byHour,
      peakHour,
      topContacts,
      topWords,
      mostActiveDay: mostActiveDayEntry
        ? { date: mostActiveDayEntry[0], count: mostActiveDayEntry[1] }
        : null,
      avgPerDay:
        activeDays.size > 0 ? Math.round(totalSent / activeDays.size) : 0,
    };
  } finally {
    await client.disconnect();
  }
});
