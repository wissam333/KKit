import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, msgIds } = await readBody(event);

  // Accept either a single msgId (legacy) or an array msgIds (bulk)
  const ids = Array.isArray(msgIds)
    ? msgIds.map(Number).filter(Boolean)
    : [Number(msgIds ?? 0)].filter(Boolean);

  if (!ids.length) {
    throw createError({ statusCode: 400, message: "No message IDs provided" });
  }

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );

  await client.connect();

  try {
    await client.deleteMessages("me", ids, { revoke: true });
    return { ok: true, deleted: ids.length };
  } finally {
    await client.disconnect();
  }
});
