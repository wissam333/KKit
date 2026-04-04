import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, phone } = await readBody(event);
  const client = new TelegramClient(
    new StringSession(""),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();
  const { phoneCodeHash } = await client.sendCode(
    { apiId: parseInt(apiId), apiHash },
    phone,
  );
  const session = client.session.save();
  // We must disconnect here — session string carries the auth state
  await client.disconnect();
  return { session, phoneCodeHash };
});
