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
    const me = await client.getMe();
    const entity = await client.getEntity(channelId);
    const msgs = await client.getMessages(entity, { limit: 100, fromUser: me });
    return {
      messages: msgs
        .filter((m) => m.message)
        .map((m) => ({
          id: m.id,
          message: m.message,
          date: m.date,
        })),
    };
  } finally {
    await client.disconnect();
  }
});
