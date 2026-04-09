import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram";

export default defineEventHandler(async (event) => {
  const {
    apiId,
    apiHash,
    session,
    channelId,
    limit = 500,
    method = "auto",
  } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();

  try {
    const memberLimit = Math.min(Math.max(parseInt(limit) || 500, 10), 10000);
    const entity = await client.getEntity(channelId);
    const seen = new Map(); // id -> user object

    // ── Method A: direct participants (admin or small group) ──
    const tryDirect = async () => {
      try {
        const result = await client.getParticipants(entity, {
          limit: memberLimit,
        });
        for (const u of result) seen.set(u.id?.toString(), u);
        return true;
      } catch (err) {
        if (err.message?.includes("CHAT_ADMIN_REQUIRED")) return false;
        throw err;
      }
    };

    // ── Method B: recent participants paginated ───────────────
    const tryRecent = async () => {
      let offset = 0;
      let fetched = 0;
      while (seen.size < memberLimit) {
        try {
          const result = await client.invoke(
            new Api.channels.GetParticipants({
              channel: entity,
              filter: new Api.ChannelParticipantsRecent(),
              offset,
              limit: 200,
              hash: BigInt(0),
            }),
          );
          const users = result.users ?? [];
          if (!users.length) break;
          for (const u of users) seen.set(u.id?.toString(), u);
          fetched += users.length;
          if (users.length < 200) break;
          offset += 200;
        } catch {
          break;
        }
      }
      return seen.size > 0;
    };

    // ── Method C: search sweep a-z + digits + Arabic ──────────
    const trySweep = async () => {
      const chars = [
        ..."abcdefghijklmnopqrstuvwxyz0123456789",
        ..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي",
      ];
      for (const q of chars) {
        if (seen.size >= memberLimit) break;
        let offset = 0;
        while (seen.size < memberLimit) {
          try {
            const result = await client.invoke(
              new Api.channels.GetParticipants({
                channel: entity,
                filter: new Api.ChannelParticipantsSearch({ q }),
                offset,
                limit: 200,
                hash: BigInt(0),
              }),
            );
            const users = result.users ?? [];
            if (!users.length) break;
            for (const u of users) seen.set(u.id?.toString(), u);
            if (users.length < 200) break;
            offset += 200;
          } catch {
            break;
          }
        }
      }
    };

    // ── Method D: scrape from message history ─────────────────
    // Works on ANY channel/group you can read. Collects senders of messages.
    const tryMessages = async () => {
      // how many messages to scan — more = more unique users found
      const msgScanLimit = Math.min(memberLimit * 10, 100000);
      let offsetId = 0;
      let scanned = 0;
      const userIds = new Set();

      while (scanned < msgScanLimit && seen.size < memberLimit) {
        try {
          const result = await client.invoke(
            new Api.messages.GetHistory({
              peer: entity,
              offsetId,
              offsetDate: 0,
              addOffset: 0,
              limit: 100,
              maxId: 0,
              minId: 0,
              hash: BigInt(0),
            }),
          );

          const messages = result.messages ?? [];
          if (!messages.length) break;

          // collect user objects from the `users` array in the response
          for (const u of result.users ?? []) {
            if (!seen.has(u.id?.toString())) {
              seen.set(u.id?.toString(), u);
            }
          }

          // also track from_id for completeness
          for (const msg of messages) {
            if (msg.fromId?.userId) {
              userIds.add(msg.fromId.userId.toString());
            }
          }

          scanned += messages.length;
          offsetId = messages[messages.length - 1].id;
          if (messages.length < 100) break;
        } catch {
          break;
        }
      }
    };

    // ── Auto strategy ─────────────────────────────────────────
    if (method === "messages") {
      await tryMessages();
    } else if (method === "participants") {
      (await tryDirect()) || (await tryRecent()) || (await trySweep());
    } else {
      // auto: try participants first, fall back to messages
      const gotDirect = await tryDirect();
      if (!gotDirect) {
        await tryRecent();
        await trySweep();
        // if still not enough, supplement with message scrapin
        if (seen.size < memberLimit * 0.5) {
          await tryMessages();
        }
      }
    }

    return [...seen.values()].slice(0, memberLimit).map((p) => ({
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
