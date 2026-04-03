// composables/useTelegram.js

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SAFE_DELAY = 500;

export const useTgClient = () => useState("tg_client", () => null);
export const useTgConnected = () => useState("tg_connected", () => false);

export const useTelegram = () => {
  const client = useTgClient();
  const isConnected = useTgConnected();

  const connect = async ({ apiId, apiHash, session = "" }) => {
    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions");
    const stringSession = new StringSession(session);
    client.value = new TelegramClient(stringSession, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });
    await client.value.connect();
    isConnected.value = true;
    return client.value;
  };

  const getSession = () => client.value?.session?.save() ?? "";

  const disconnect = () => {
    try {
      client.value?.disconnect?.();
    } catch {}
    client.value = null;
    isConnected.value = false;
  };

  const getDialogs = async ({ limit = 300 } = {}) => {
    if (!client.value) return [];
    const dialogs = await client.value.getDialogs({ limit });
    return dialogs.filter((d) => d.isChannel || d.isGroup);
  };

  const getMessages = async (entity, { limit = 100 } = {}) => {
    if (!client.value) return [];
    return await client.value.getMessages(entity, { limit });
  };

  const scanAllChannels = async ({
    limit = 100,
    cutoffDate,
    onEachMessage,
    onProgress,
  } = {}) => {
    if (!client.value) return;
    const dialogs = await getDialogs({ limit: 300 });
    for (let i = 0; i < dialogs.length; i++) {
      const ch = dialogs[i];
      try {
        const msgs = await client.value.getMessages(ch.entity, { limit });
        for (const msg of msgs) {
          if (!msg.message) continue;
          if (cutoffDate && new Date(msg.date * 1000) < cutoffDate) continue;
          onEachMessage?.(msg, ch);
        }
      } catch {}
      onProgress?.(i + 1, dialogs.length);
      await sleep(SAFE_DELAY);
    }
  };

  const deleteMyMessages = async (entity, { onProgress } = {}) => {
    if (!client.value) return { deleted: 0 };
    const me = await client.value.getMe();
    const msgs = await client.value.getMessages(entity, {
      limit: 100,
      fromUser: me,
    });
    const ids = msgs.map((m) => m.id);
    if (!ids.length) return { deleted: 0 };
    await client.value.deleteMessages(entity, ids, { revoke: true });
    onProgress?.(ids.length);
    return { deleted: ids.length };
  };

  const getMembers = async (entity, { limit = 200 } = {}) => {
    if (!client.value) return [];
    try {
      const participants = await client.value.getParticipants(entity, {
        limit,
      });
      return participants.map((p) => ({
        id: p.id?.toString(),
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        username: p.username ?? "",
        phone: p.phone ?? "",
        isBot: p.bot ?? false,
      }));
    } catch {
      return [];
    }
  };

  const analyzeChannel = async (entity, { limit = 200 } = {}) => {
    if (!client.value) return null;
    const msgs = await client.value.getMessages(entity, { limit });
    const byHour = Array(24).fill(0);
    const wordCount = {};
    const stopwords = new Set([
      "في",
      "من",
      "إلى",
      "على",
      "مع",
      "هذا",
      "هذه",
      "التي",
      "الذي",
      "وقد",
      "كان",
      "عن",
      "the",
      "a",
      "an",
      "is",
      "in",
      "of",
      "to",
      "and",
      "for",
      "on",
      "at",
      "by",
      "or",
      "it",
      "that",
      "this",
    ]);
    for (const msg of msgs) {
      if (!msg.message) continue;
      const d = new Date(msg.date * 1000);
      byHour[d.getHours()]++;
      msg.message
        .toLowerCase()
        .replace(/[^\u0600-\u06FFa-z\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopwords.has(w))
        .forEach((w) => {
          wordCount[w] = (wordCount[w] ?? 0) + 1;
        });
    }
    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word, count]) => ({ word, count }));
    return {
      totalMessages: msgs.length,
      byHour,
      topWords,
      peakHour: byHour.indexOf(Math.max(...byHour)),
    };
  };

  const getMediaList = async (entity, { limit = 50 } = {}) => {
    if (!client.value) return [];
    const msgs = await client.value.getMessages(entity, { limit });
    return msgs
      .filter((m) => m.media)
      .map((m) => ({
        id: m.id,
        date: new Date(m.date * 1000),
        type: m.photo ? "photo" : m.document ? "document" : "other",
        fileName:
          m.document?.attributes?.find((a) => a.fileName)?.fileName ??
          `file_${m.id}`,
        size: m.document?.size ?? null,
        msg: m,
      }));
  };

  const downloadMedia = async (msg) => {
    if (!client.value) return null;
    return await client.value.downloadMedia(msg, { workers: 1 });
  };

  return {
    client,
    isConnected,
    connect,
    getSession,
    disconnect,
    getDialogs,
    getMessages,
    scanAllChannels,
    deleteMyMessages,
    getMembers,
    analyzeChannel,
    getMediaList,
    downloadMedia,
  };
};
