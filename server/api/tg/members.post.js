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
    const entity = await client.getEntity(channelId);
    const participants = await client.getParticipants(entity, { limit: 500 });
    return participants.map((p) => ({
      id: p.id?.toString(),
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      username: p.username ?? "",
      phone: p.phone ?? "",
      isBot: p.bot ?? false,
    }));
  } finally {
    await client.disconnect();
  }
});
