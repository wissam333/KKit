import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

// ── Stopwords ──────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  // Arabic
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
  "قال",
  "كل",
  "هو",
  "هي",
  "لا",
  "ما",
  "أن",
  "إن",
  "كما",
  "أو",
  "لم",
  "قد",
  "لك",
  "لي",
  "نا",
  "هم",
  "أنا",
  "أنت",
  "هل",
  "عند",
  "بعد",
  "قبل",
  "حتى",
  "أي",
  "بس",
  "يا",
  "وال",
  "ولا",
  "وما",
  "عله",
  "ليس",
  "منذ",
  "حول",
  "خلال",
  "رغم",
  "بين",
  "ثم",
  "لكن",
  "لأن",
  "لأنه",
  "لأنها",
  "وهو",
  "وهي",
  "وهم",
  "أيضا",
  "فقط",
  "جدا",
  // English
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
  "was",
  "are",
  "have",
  "has",
  "been",
  "will",
  "with",
  "you",
  "me",
  "my",
  "we",
  "our",
  "i",
  "he",
  "she",
  "they",
  "do",
  "did",
  "be",
  "as",
  "so",
  "up",
  "if",
  "no",
  "ok",
  "yes",
  "not",
  "but",
  "just",
  "get",
  "got",
  "can",
  "im",
  "its",
  "all",
  "one",
  "more",
  "out",
  "about",
  "what",
  "like",
  "how",
  "then",
  "when",
  "also",
  "now",
  "from",
  "been",
  "into",
  "him",
  "her",
  "us",
  "your",
  "his",
  "their",
]);

const MIN_WORD_LEN = 3;
const DIALOG_FETCH_LIMIT = 500; // messages per dialog
const MAX_DIALOGS = 150;
const DELAY_MS = 150; // reduced from 300ms

// ── Helpers ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extractWords = (text) =>
  text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "") // strip URLs
    .replace(/[^\u0600-\u06FFa-z\s]/g, " ") // keep Arabic + Latin letters
    .split(/\s+/)
    .filter((w) => w.length > MIN_WORD_LEN && !STOPWORDS.has(w));

const getDisplayName = (entity) => {
  if (!entity) return "Unknown";
  if (entity.firstName || entity.lastName)
    return [entity.firstName, entity.lastName].filter(Boolean).join(" ");
  if (entity.username) return `@${entity.username}`;
  if (entity.title) return entity.title;
  return "Unknown";
};

// ── Handler ────────────────────────────────────────────────────────────────
export default defineEventHandler(async (event) => {
  const { apiId, apiHash, session, period } = await readBody(event);

  const client = new TelegramClient(
    new StringSession(session),
    parseInt(apiId),
    apiHash,
    { connectionRetries: 3 },
  );

  await client.connect();

  try {
    const cutoffTs = Math.floor(Date.now() / 1000) - period * 86400; // unix seconds

    const me = await client.getMe();
    const myId = me.id?.toString();
    const myName = getDisplayName(me);

    // ── Fetch dialogs ──────────────────────────────────────────────────────
    const allDialogs = await client.getDialogs({
      limit: MAX_DIALOGS,
      archived: false,
    });

    const privateDialogs = allDialogs.filter((d) => !d.isChannel && !d.isGroup);
    const groupDialogs = allDialogs.filter((d) => d.isGroup);
    const channelDialogs = allDialogs.filter((d) => d.isChannel && !d.isGroup);

    // ── Accumulators ───────────────────────────────────────────────────────
    let totalSent = 0;
    let totalReceived = 0;
    let mediaSent = 0;
    let mediaReceived = 0;
    let linksSent = 0;

    const activeDaysSet = new Set();
    const byHour = Array(24).fill(0);
    const byWeekday = Array(7).fill(0); // 0=Sun … 6=Sat
    const contactSentMap = {}; // how many msgs YOU sent per contact
    const contactReceivedMap = {}; // how many msgs contact sent to you
    const wordCount = {};
    const dayMap = {};
    const emojiCount = {};
    let longestStreak = 0;
    let currentStreak = 0;
    let prevDay = null;
    let replyCount = 0;
    let totalChars = 0;

    // ── Process a batch of messages ────────────────────────────────────────
    const processMsgs = (msgs, peerName) => {
      for (const msg of msgs) {
        if (!msg.message && !msg.media) continue;
        if (msg.date < cutoffTs) continue;

        const msgDate = new Date(msg.date * 1000);
        const h = msgDate.getHours();
        const wd = msgDate.getDay();
        const dayKey = msgDate.toISOString().slice(0, 10); // YYYY-MM-DD

        byHour[h]++;
        byWeekday[wd]++;
        activeDaysSet.add(dayKey);
        dayMap[dayKey] = (dayMap[dayKey] ?? 0) + 1;

        if (msg.replyTo) replyCount++;

        if (msg.out) {
          totalSent++;
          if (msg.media) mediaSent++;
          if (msg.message) {
            totalChars += msg.message.length;
            // Links
            if (/https?:\/\//i.test(msg.message)) linksSent++;
            // Words
            extractWords(msg.message).forEach((w) => {
              wordCount[w] = (wordCount[w] ?? 0) + 1;
            });
            // Emojis
            const emojis = [
              ...msg.message.matchAll(/\p{Emoji_Presentation}/gu),
            ].map((m) => m[0]);
            emojis.forEach((e) => {
              emojiCount[e] = (emojiCount[e] ?? 0) + 1;
            });
          }
          if (peerName)
            contactSentMap[peerName] = (contactSentMap[peerName] ?? 0) + 1;
        } else {
          totalReceived++;
          if (msg.media) mediaReceived++;
          if (peerName)
            contactReceivedMap[peerName] =
              (contactReceivedMap[peerName] ?? 0) + 1;
        }
      }
    };

    // ── Scan private dialogs ───────────────────────────────────────────────
    for (const dialog of privateDialogs) {
      try {
        const peerName = getDisplayName(dialog.entity);
        const msgs = await client.getMessages(dialog.entity, {
          limit: DIALOG_FETCH_LIMIT,
          reverse: false,
        });
        processMsgs(msgs, peerName);
      } catch {
        /* skip unreachable */
      }
      await sleep(DELAY_MS);
    }

    // ── Scan group dialogs (only your own messages) ───────────────────────
    for (const dialog of groupDialogs) {
      try {
        const msgs = await client.getMessages(dialog.entity, {
          limit: DIALOG_FETCH_LIMIT,
          fromUser: "me",
          reverse: false,
        });
        processMsgs(msgs, null); // don't attribute groups to a contact name
      } catch {
        /* skip */
      }
      await sleep(DELAY_MS);
    }

    // ── Compute streak ────────────────────────────────────────────────────
    const sortedDays = [...activeDaysSet].sort();
    for (const day of sortedDays) {
      if (prevDay) {
        const diff = (new Date(day) - new Date(prevDay)) / 86400000;
        currentStreak = diff === 1 ? currentStreak + 1 : 1;
      } else {
        currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      prevDay = day;
    }

    // ── Derive peaks ──────────────────────────────────────────────────────
    const peakHour = byHour.indexOf(Math.max(...byHour));
    const peakWeekday = byWeekday.indexOf(Math.max(...byWeekday));
    const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const topContacts = Object.entries(contactSentMap)
      .map(([name, sent]) => ({
        name,
        sent,
        received: contactReceivedMap[name] ?? 0,
        count: sent + (contactReceivedMap[name] ?? 0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24)
      .map(([word, count]) => ({ word, count }));

    const topEmojis = Object.entries(emojiCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([emoji, count]) => ({ emoji, count }));

    const mostActiveDayEntry = Object.entries(dayMap).sort(
      (a, b) => b[1] - a[1],
    )[0];

    const avgCharsPerMsg =
      totalSent > 0 ? Math.round(totalChars / totalSent) : 0;
    const responseRate =
      totalReceived > 0 ? Math.round((totalSent / totalReceived) * 100) : 0;

    return {
      myName,
      totalSent,
      totalReceived,
      mediaSent,
      mediaReceived,
      linksSent,
      replyCount,
      avgCharsPerMsg,
      responseRate,
      activeDays: activeDaysSet.size,
      longestStreak,
      channelsRead: channelDialogs.length,
      groupsActive: groupDialogs.length,
      byHour,
      byWeekday,
      peakHour,
      peakWeekday,
      peakWeekdayName: WEEKDAY_NAMES[peakWeekday],
      topContacts,
      topWords,
      topEmojis,
      mostActiveDay: mostActiveDayEntry
        ? { date: mostActiveDayEntry[0], count: mostActiveDayEntry[1] }
        : null,
      avgPerDay:
        activeDaysSet.size > 0 ? Math.round(totalSent / activeDaysSet.size) : 0,
    };
  } finally {
    await client.disconnect();
  }
});
