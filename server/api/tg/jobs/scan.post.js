import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, searchDays, keywords, locale } =
    await readBody(event);
  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();
  try {
    const cutoff = new Date();
    if (searchDays === 0) cutoff.setHours(0, 0, 0, 0);
    else {
      cutoff.setDate(cutoff.getDate() - searchDays);
      cutoff.setHours(0, 0, 0, 0);
    }

    const dialogs = await client.getDialogs({ limit: 300 });
    const jobs = [];
    let scanned = 0;

    for (const ch of dialogs) {
      try {
        const msgs = await client.getMessages(ch.entity, { limit: 100 });
        for (const msg of msgs) {
          if (!msg.message) continue;
          if (new Date(msg.date * 1000) < cutoff) continue;
          const lower = msg.message.toLowerCase();
          const matched = keywords.filter((kw) =>
            lower.includes(kw.toLowerCase()),
          );
          if (matched.length) {
            jobs.push({
              id: `${ch.id}_${msg.id}`,
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
              matchedKeywords: matched,
            });
          }
        }
      } catch {
        /* skip */
      }
      scanned++;
      await new Promise((r) => setTimeout(r, 300));
    }
    return { jobs, scanned };
  } finally {
    await client.disconnect();
  }
});
