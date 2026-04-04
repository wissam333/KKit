import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, rules } = await readBody(event);
  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );
  await client.connect();
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rules.inactiveDays);
    const dialogs = await client.getDialogs({ limit: 300 });
    const candidates = [];
    for (const d of dialogs) {
      if (d.isChannel && !d.isGroup && !rules.includeChannels) continue;
      if (d.isGroup && !rules.includeGroups) continue;
      if (!d.isChannel && !d.isGroup && !rules.includePrivate) continue;
      const titleLower = (d.title ?? "").toLowerCase();
      if (
        rules.skipIfContains?.some((kw) =>
          titleLower.includes(kw.toLowerCase()),
        )
      )
        continue;
      const lastMsgDate = d.date ? new Date(d.date * 1000) : null;
      if (!lastMsgDate || lastMsgDate >= cutoff) continue;
      if (d.archived) continue;
      const msgCount = d.unreadCount ?? null;
      if (
        rules.minMessages > 0 &&
        msgCount !== null &&
        msgCount >= rules.minMessages
      )
        continue;
      const daysSince = Math.floor(
        (Date.now() - lastMsgDate.getTime()) / 86400000,
      );
      candidates.push({
        id: d.id?.toString(),
        title: d.title ?? d.name ?? "Unknown",
        type:
          d.isChannel && !d.isGroup
            ? "channel"
            : d.isGroup
              ? "group"
              : "private",
        lastMsgLabel: `${daysSince}d ago`,
        msgCount,
      });
    }
    return { candidates };
  } finally {
    await client.disconnect();
  }
});
