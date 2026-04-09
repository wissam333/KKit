import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const {
    apiId,
    apiHash,
    session,
    limit = 200,
    includeGroups = true,
  } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();

  try {
    const dlLimit = Math.min(Math.max(parseInt(limit) || 200, 10), 1000);
    const dialogs = await client.getDialogs({ limit: dlLimit });

    return dialogs
      .filter((d) => {
        if (includeGroups) return d.isChannel || d.isGroup;
        return d.isChannel && !d.isGroup;
      })
      .map((d) => ({
        id: d.id?.toString(),
        title: d.title,
        username: d.entity?.username ?? null,
        isChannel: d.isChannel && !d.isGroup,
        isGroup: d.isGroup,
      }));
  } finally {
    await client.disconnect();
  }
});
