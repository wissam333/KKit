import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, channelId } = await readBody(event);
  const client = new TelegramClient(new StringSession(session), parseInt(apiId), apiHash, { connectionRetries: 3 });
  await client.connect();
  try {
    const entity = await client.getEntity(channelId);
    const msgs = await client.getMessages(entity, { limit: 100 });
    return {
      items: msgs.filter((m) => m.media).map((m) => ({
        id: m.id,
        date: new Date(m.date * 1000).toISOString(),
        type: m.photo ? "photo" : m.document ? "document" : "other",
        fileName: m.document?.attributes?.find((a) => a.fileName)?.fileName ?? `file_${m.id}`,
        size: m.document?.size ?? null,
      })),
    };
  } finally {
    await client.disconnect();
  }
});