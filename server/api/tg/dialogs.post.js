import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session } = await readBody(event);
  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();
  const dialogs = await client.getDialogs({ limit: 300 });
  await client.disconnect();
  return dialogs
    .filter((d) => d.isChannel || d.isGroup)
    .map((d) => ({
      id: d.id?.toString(),
      title: d.title,
      isChannel: d.isChannel,
      isGroup: d.isGroup,
    }));
});
