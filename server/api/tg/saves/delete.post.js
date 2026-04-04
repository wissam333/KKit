import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, msgId } = await readBody(event);
  const client = new TelegramClient(new StringSession(session), parseInt(apiId), apiHash, { connectionRetries: 3 });
  await client.connect();
  try {
    await client.deleteMessages("me", [msgId], { revoke: true });
    return { ok: true };
  } finally {
    await client.disconnect();
  }
});