import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, phone, code, phoneCodeHash, session } =
    await readBody(event);
  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();
  try {
    await client.invoke(
      new (await import("telegram/tl")).Api.auth.SignIn({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      }),
    );
  } catch (e) {
    // SESSION_PASSWORD_NEEDED means 2FA — handle separately if needed
    if (e.errorMessage !== "SESSION_PASSWORD_NEEDED") {
      await client.disconnect();
      throw createError({ statusCode: 400, message: e.message });
    }
  }
  const newSession = client.session.save();
  await client.disconnect();
  return { session: newSession };
});
