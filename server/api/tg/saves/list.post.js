import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const SUPPORTED_LIMITS = [50, 100, 200, 500];
const MAX_LIMIT = 500;

export default defineEventHandler(async (event) => {
  const {
    apiId,
    apiHash,
    session,
    limit = 200,
    offsetId = 0,
  } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );

  await client.connect();

  try {
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 200), MAX_LIMIT);

    const msgs = await client.getMessages("me", {
      limit: safeLimit,
      offsetId: parseInt(offsetId) || 0,
      reverse: false,
    });

    const messages = msgs
      .filter((m) => m.message || m.media)
      .map((m) => {
        const hasPhoto = !!m.photo;
        const hasDocument = !!m.document;
        const hasMedia = hasPhoto || hasDocument || !!m.media;

        // Extract file name for documents
        const fileName = hasDocument
          ? (m.document?.attributes?.find(
              (a) => a.className === "DocumentAttributeFilename",
            )?.fileName ?? null)
          : null;

        // Extract URLs from message text
        const urls = [];
        if (m.message) {
          const matches = m.message.match(/https?:\/\/[^\s]+/gi);
          if (matches) urls.push(...matches);
        }

        // Extract forwarded source info
        const forwardedFrom = m.fwdFrom
          ? {
              date: m.fwdFrom.date ?? null,
              fromName: m.fwdFrom.fromName ?? null,
            }
          : null;

        return {
          id: m.id.toString(),
          text: m.message ?? "",
          date: m.date,
          hasMedia,
          mediaType: hasPhoto
            ? "photo"
            : hasDocument
              ? "document"
              : m.media
                ? "media"
                : null,
          fileName,
          urls,
          forwardedFrom,
          isForwarded: !!m.fwdFrom,
          replyToMsgId: m.replyTo?.replyToMsgId?.toString() ?? null,
        };
      });

    // Cursor for pagination: lowest message ID in this page
    const nextOffsetId =
      messages.length > 0
        ? Math.min(...messages.map((m) => parseInt(m.id)))
        : null;

    return {
      messages,
      total: messages.length,
      nextOffsetId: messages.length === safeLimit ? nextOffsetId : null,
      hasMore: messages.length === safeLimit,
    };
  } finally {
    await client.disconnect();
  }
});
