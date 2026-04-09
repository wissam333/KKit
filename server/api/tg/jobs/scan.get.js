// server/api/tg/jobs/scan.get.js
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const {
    apiId,
    apiHash,
    session,
    searchDays,
    keywords,
    locale,
    dialogLimit, // how many channels to load (sent from UI)
    msgLimit, // how many messages per channel (sent from UI)
  } = query;

  // ── SSE headers ──────────────────────────────────────────────
  setResponseHeaders(event, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (data) => {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );

  try {
    await client.connect();

    // ── Date cutoff ─────────────────────────────────────────
    const cutoff = new Date();
    const days = parseInt(searchDays ?? "0");
    if (days === 0) cutoff.setHours(0, 0, 0, 0);
    else {
      cutoff.setDate(cutoff.getDate() - days);
      cutoff.setHours(0, 0, 0, 0);
    }

    const kws = JSON.parse(keywords ?? "[]");
    const dlLimit = Math.min(Math.max(parseInt(dialogLimit ?? "300"), 1), 500);
    const mLimit = Math.min(Math.max(parseInt(msgLimit ?? "100"), 1), 500);

    // ── Fetch dialogs then keep channels only ────────────────
    const allDialogs = await client.getDialogs({ limit: dlLimit });
    const channels = allDialogs.filter((d) => d.isChannel && !d.isGroup);

    send({ type: "total", total: channels.length });

    let scanned = 0;

    for (const ch of channels) {
      try {
        const msgs = await client.getMessages(ch.entity, { limit: mLimit });
        for (const msg of msgs) {
          if (!msg.message) continue;
          if (new Date(msg.date * 1000) < cutoff) continue;
          const lower = msg.message.toLowerCase();
          const matched = kws.filter((kw) => lower.includes(kw.toLowerCase()));
          if (matched.length) {
            send({
              type: "job",
              job: {
                id: `${ch.id}_${msg.id}`,
                channel: ch.title,
                text: msg.message,
                time: new Date(msg.date * 1000).toLocaleString(
                  locale === "ar" ? "ar-EG" : "en-GB",
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                ),
                link: ch.entity?.username
                  ? `https://t.me/${ch.entity.username}/${msg.id}`
                  : null,
                matchedKeywords: matched,
              },
            });
          }
        }
      } catch {
        /* skip inaccessible channel */
      }

      scanned++;
      send({ type: "progress", scanned, total: channels.length });
      await new Promise((r) => setTimeout(r, 150));
    }

    send({ type: "done", scanned });
  } catch (err) {
    send({ type: "error", message: err?.message ?? "Unknown error" });
  } finally {
    await client.disconnect();
    event.node.res.end();
  }
});
