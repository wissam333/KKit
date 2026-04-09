import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, rules } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 }
  );

  await client.connect();

  try {
    const cutoff = Date.now() - rules.inactiveDays * 86400000;
    const dialogs = await client.getDialogs({ limit: 300, archived: false });
    const candidates = [];

    for (const d of dialogs) {
      const isChannel = d.isChannel && !d.isGroup;
      const isGroup = d.isGroup;
      const isPrivate = !d.isChannel && !d.isGroup;

      if (isChannel && !rules.includeChannels) continue;
      if (isGroup && !rules.includeGroups) continue;
      if (isPrivate && !rules.includePrivate) continue;
      if (d.archived) continue;

      const lastMsgDate = d.date ? d.date * 1000 : null;
      if (!lastMsgDate || lastMsgDate >= cutoff) continue;

      const titleLower = (d.title ?? d.name ?? "").toLowerCase();
      if (rules.skipIfContains?.some((kw) => titleLower.includes(kw.toLowerCase()))) continue;

      const unread = d.unreadCount ?? 0;
      if (rules.minMessages > 0 && unread >= rules.minMessages) continue;

      const daysSince = Math.floor((Date.now() - lastMsgDate) / 86400000);

      candidates.push({
        id: d.id?.toString(),
        title: d.title ?? d.name ?? "Unknown",
        type: isChannel ? "channel" : isGroup ? "group" : "private",
        lastMsgLabel: `${daysSince}d ago`,
        lastMsgDate,
        msgCount: unread,
      });
    }

    // Sort by most inactive first
    candidates.sort((a, b) => a.lastMsgDate - b.lastMsgDate);

    return { candidates: candidates.map(({ lastMsgDate: _, ...rest }) => rest) };
  } finally {
    await client.disconnect();
  }
});