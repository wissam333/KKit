import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, channelId, limit = 50 } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 }
  );

  await client.connect();

  try {
    const entity = await client.getEntity(channelId);
    const msgs = await client.getMessages(entity, { limit: Math.min(Math.max(1, parseInt(limit)), 200) });

    const items = msgs
      .filter((m) => m.media)
      .map((m) => ({
        id: m.id,
        date: new Date(m.date * 1000).toISOString(),
        type: m.photo ? "photo" : m.document ? "document" : "other",
        fileName:
          m.document?.attributes?.find((a) => a.className === "DocumentAttributeFilename")?.fileName ??
          (m.photo ? `photo_${m.id}.jpg` : `file_${m.id}`),
        size: m.document?.size ? Number(m.document.size) : null,
      }));

    return { items, total: items.length };
  } finally {
    await client.disconnect();
  }
});