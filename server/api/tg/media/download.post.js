import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, channelId, msgId } = await readBody(event);
  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();
  try {
    const entity = await client.getEntity(channelId);
    const msgs = await client.getMessages(entity, { ids: [msgId] });
    if (!msgs[0])
      throw createError({ statusCode: 404, message: "Message not found" });
    const buffer = await client.downloadMedia(msgs[0], { workers: 1 });
    return { data: Buffer.from(buffer).toString("base64") };
  } finally {
    await client.disconnect();
  }
});
