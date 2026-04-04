import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session } = await readBody(event);
  const client = new TelegramClient(new StringSession(session), parseInt(apiId), apiHash, { connectionRetries: 3 });
  await client.connect();
  try {
    const msgs = await client.getMessages("me", { limit: 200 });
    return {
      messages: msgs.filter((m) => m.message || m.media).map((m) => ({
        id: m.id.toString(),
        text: m.message ?? "",
        date: m.date,
        hasMedia: !!m.media,
        mediaType: m.photo ? "photo" : m.document ? "document" : m.media ? "media" : null,
      })),
    };
  } finally {
    await client.disconnect();
  }
});