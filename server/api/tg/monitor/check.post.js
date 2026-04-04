import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const {
    apiId,
    apiHash,
    session,
    keywords,
    lookbackSeconds,
    seenIds,
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
    const dialogs = await client.getDialogs({ limit: 200 });
    const hits = [];
    const seenSet = new Set(seenIds ?? []);
    for (const ch of dialogs) {
      try {
        const msgs = await client.getMessages(ch.entity, { limit: 20 });
        for (const msg of msgs) {
          if (!msg.message) continue;
          if (new Date(msg.date * 1000) < cutoff) continue;
          const msgKey = `${ch.id}_${msg.id}`;
          if (seenSet.has(msgKey)) continue;
          const lower = msg.message.toLowerCase();
          const matched = keywords.filter((kw) =>
            lower.includes(kw.toLowerCase()),
          );
          if (matched.length) {
            hits.push({
              msgKey,
              channel: ch.title,
              text: msg.message,
              time: new Date(msg.date * 1000).toLocaleString(
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
        /* skip */
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return { hits };
  } finally {
    await client.disconnect();
  }
});
