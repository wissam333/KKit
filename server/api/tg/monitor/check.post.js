// server/api/tg/monitor/check.post.js
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const {
    apiId,
    apiHash,
    session,
    keywords,
    lookbackSeconds = 240,
    dialogLimit = 200, // how many channels to load
    msgLimit = 20, // messages per channel per check
    seenIds = [],
    locale,
  } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();

  try {
    const cutoff = new Date(Date.now() - lookbackSeconds * 1000);
    const dlLimit = Math.min(Math.max(parseInt(dialogLimit), 10), 500);
    const mLimit = Math.min(Math.max(parseInt(msgLimit), 5), 100);

    const allDialogs = await client.getDialogs({ limit: dlLimit });

    // Channels only — consistent with jobs and analytics tools
    const channels = allDialogs.filter((d) => d.isChannel && !d.isGroup);

    const hits = [];
    const seenSet = new Set(seenIds);
    // Track only IDs found this run to return as the new delta
    const newSeenIds = [];

    for (const ch of channels) {
      try {
        const msgs = await client.getMessages(ch.entity, { limit: mLimit });
        for (const msg of msgs) {
          if (!msg.message) continue;

          const msgTime = new Date(msg.date * 1000);
          if (msgTime < cutoff) continue;

          const msgKey = `${ch.id}_${msg.id}`;
          if (seenSet.has(msgKey)) continue;

          newSeenIds.push(msgKey);

          const lower = msg.message.toLowerCase();
          const matched = keywords.filter((kw) =>
            lower.includes(kw.toLowerCase()),
          );
          if (matched.length) {
            hits.push({
              msgKey,
              channel: ch.title,
              text: msg.message,
              time: msgTime.toLocaleString(
                locale === "ar" ? "ar-EG" : "en-GB",
                {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              ),
              link: ch.entity?.username
                ? `https://t.me/${ch.entity.username}/${msg.id}`
                : null,
              keywords: matched,
            });
          }
        }
      } catch {
        /* skip inaccessible channel */
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    // Return only the NEW ids seen this run — client merges them in
    return { hits, newSeenIds };
  } finally {
    await client.disconnect();
  }
});
