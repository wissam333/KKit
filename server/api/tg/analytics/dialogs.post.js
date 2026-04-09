// server/api/tg/dialogs.post.js
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, limit = 300 } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();

  try {
    const dlLimit = Math.min(Math.max(parseInt(limit), 10), 500);
    const dialogs = await client.getDialogs({ limit: dlLimit });

    // Channels only — same rule as the jobs scanner
    return dialogs
      .filter((d) => d.isChannel && !d.isGroup)
      .map((d) => ({
        id: d.id?.toString(),
        title: d.title,
        username: d.entity?.username ?? null,
        isChannel: true,
      }));
  } finally {
    await client.disconnect();
  }
});
