<template>
  <div class="jobs-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <!-- ══════════════════════════════════════
         SAVED SESSION BANNER
    ══════════════════════════════════════ -->
    <transition name="slide-down">
      <div v-if="showSessionBanner" class="session-banner">
        <div class="session-banner-inner">
          <div class="session-banner-left">
            <div class="session-icon">
              <Icon name="mdi:shield-check" size="22" />
            </div>
            <div>
              <div class="session-banner-title">
                {{ $t("jobs.setup.savedSession") }}
              </div>
              <div class="session-banner-sub">
                {{ $t("jobs.setup.savedSessionDesc") }}
              </div>
            </div>
          </div>
          <div class="session-banner-actions">
            <button class="session-btn primary" @click="restoreSession">
              {{ $t("jobs.setup.continueSession") }}
            </button>
            <button class="session-btn ghost" @click="clearSession">
              {{ $t("jobs.setup.newSession") }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════
         STEP 1: SETUP
    ══════════════════════════════════════ -->
    <transition name="fade-slide">
      <div v-if="step === 'setup'" class="centered-wrap">
        <div class="card setup-card">
          <!-- Header -->
          <div class="card-hero">
            <div class="hero-icon tg-blue">
              <Icon name="mdi:telegram" size="32" />
            </div>
            <h1 class="card-title">{{ $t("jobs.setup.title") }}</h1>
            <p class="card-sub">{{ $t("jobs.setup.subtitle") }}</p>
          </div>

          <!-- ── Guide Accordion ── -->
          <div class="guide-block">
            <button class="guide-toggle" @click="showGuide = !showGuide">
              <Icon name="mdi:help-circle-outline" size="17" />
              <span>{{
                showGuide
                  ? $t("jobs.guide.toggleHide")
                  : $t("jobs.guide.toggleShow")
              }}</span>
              <Icon
                :name="showGuide ? 'mdi:chevron-up' : 'mdi:chevron-down'"
                size="17"
                class="guide-chevron"
              />
            </button>

            <transition name="expand">
              <div v-if="showGuide" class="guide-steps">
                <div
                  v-for="(step, i) in guideSteps"
                  :key="i"
                  class="guide-step"
                >
                  <div class="guide-num">{{ i + 1 }}</div>
                  <div class="guide-step-body">
                    <div class="guide-step-title">{{ step.title }}</div>
                    <div class="guide-step-desc">{{ step.desc }}</div>
                    <a
                      v-if="i === 0"
                      href="https://my.telegram.org"
                      target="_blank"
                      class="guide-ext-btn"
                    >
                      <Icon name="mdi:open-in-new" size="14" />
                      {{ $t("jobs.guide.step1Btn") }}
                    </a>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- ── Credentials ── -->
          <div class="form-section">
            <div class="form-grid-2">
              <div class="field">
                <label class="field-label">{{ $t("jobs.setup.apiId") }}</label>
                <input
                  v-model="form.apiId"
                  class="field-input"
                  :placeholder="$t('jobs.setup.apiIdPlaceholder')"
                  dir="ltr"
                />
              </div>
              <div class="field">
                <label class="field-label">{{
                  $t("jobs.setup.apiHash")
                }}</label>
                <input
                  v-model="form.apiHash"
                  class="field-input"
                  :placeholder="$t('jobs.setup.apiHashPlaceholder')"
                  dir="ltr"
                />
              </div>
            </div>
            <div class="field">
              <label class="field-label">{{ $t("jobs.setup.phone") }}</label>
              <input
                v-model="form.phone"
                type="tel"
                class="field-input"
                :placeholder="$t('jobs.setup.phonePlaceholder')"
                dir="ltr"
              />
            </div>
          </div>

          <!-- ── Search Settings ── -->
          <div class="form-section">
            <div class="form-grid-2">
              <div class="field">
                <label class="field-label">{{
                  $t("jobs.setup.dateRange")
                }}</label>
                <div class="seg-control">
                  <button
                    v-for="opt in rangeOptions"
                    :key="opt.value"
                    class="seg-btn"
                    :class="{ active: searchDays === opt.value }"
                    @click="searchDays = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>
              <div class="field">
                <label class="field-label">{{
                  $t("jobs.setup.messagesLimit")
                }}</label>
                <div class="seg-control">
                  <button
                    v-for="opt in limitOptions"
                    :key="opt"
                    class="seg-btn"
                    :class="{ active: msgLimit === opt }"
                    @click="msgLimit = opt"
                  >
                    {{ opt }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Keywords ── -->
          <div class="form-section">
            <div class="field">
              <label class="field-label">{{ $t("jobs.setup.keywords") }}</label>
              <div class="kw-wrap">
                <span v-for="kw in keywords" :key="kw" class="kw-tag">
                  {{ kw }}
                  <button class="kw-x" @click="removeKeyword(kw)">
                    <Icon name="mdi:close" size="11" />
                  </button>
                </span>
              </div>
              <div class="kw-add-row">
                <input
                  v-model="newKeyword"
                  class="field-input"
                  :placeholder="$t('jobs.setup.keywordPlaceholder')"
                  @keyup.enter="addKeyword"
                />
                <button class="add-kw-btn" @click="addKeyword">
                  <Icon name="mdi:plus" size="20" />
                </button>
              </div>
            </div>
          </div>

          <button
            class="primary-btn"
            :class="{ loading: connecting }"
            @click="handleConnect"
            :disabled="connecting"
          >
            <template v-if="!connecting">
              <Icon name="mdi:link-variant" size="18" />
              {{ $t("jobs.setup.connect") }}
            </template>
            <template v-else>
              <span class="spin-ring" />
              {{ $t("jobs.setup.connecting") }}
            </template>
          </button>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════
         STEP 2: OTP
    ══════════════════════════════════════ -->
    <transition name="fade-slide">
      <div v-if="step === 'otp'" class="centered-wrap">
        <div class="card otp-card">
          <div class="card-hero">
            <div class="hero-icon purple">
              <Icon name="mdi:shield-lock-outline" size="32" />
            </div>
            <h2 class="card-title">{{ $t("jobs.otp.title") }}</h2>
            <p class="card-sub">
              {{ $t("jobs.otp.subtitle") }}
              <strong dir="ltr">{{ form.phone }}</strong>
            </p>
          </div>

          <div class="otp-hint">
            <Icon name="mdi:information-outline" size="16" />
            {{ $t("jobs.otp.hint") }}
          </div>

          <div class="otp-row" dir="ltr">
            <input
              v-for="(_, i) in otpDigits"
              :key="i"
              :ref="(el) => (otpRefs[i] = el)"
              v-model="otpDigits[i]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              class="otp-box"
              @input="onOtpInput(i)"
              @keydown.backspace="onOtpBackspace(i)"
            />
          </div>

          <button
            class="primary-btn"
            :class="{ loading: signing }"
            @click="handleSignIn"
            :disabled="signing || otpDigits.join('').length < 5"
          >
            <template v-if="!signing">
              <Icon name="mdi:check-circle-outline" size="18" />
              {{ $t("jobs.otp.verify") }}
            </template>
            <template v-else>
              <span class="spin-ring" />
              {{ $t("jobs.otp.verifying") }}
            </template>
          </button>

          <button class="ghost-btn" @click="step = 'setup'">
            <Icon name="mdi:arrow-left" size="15" />
            {{ $t("jobs.otp.back") }}
          </button>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════
         STEP 3: DASHBOARD
    ══════════════════════════════════════ -->
    <transition name="fade">
      <div v-if="step === 'jobs'" class="dashboard">
        <!-- Topbar -->
        <div class="dash-bar">
          <div class="dash-bar-left">
            <span class="live-dot" />
            <h2 class="dash-title">{{ $t("jobs.dashboard.title") }}</h2>
          </div>
          <div class="dash-bar-right">
            <!-- Range switcher -->
            <div class="range-switch">
              <button
                v-for="opt in rangeOptions"
                :key="opt.value"
                class="range-btn"
                :class="{ active: searchDays === opt.value }"
                @click="
                  searchDays = opt.value;
                  scanJobs();
                "
              >
                {{ opt.shortLabel }}
              </button>
            </div>
            <button
              class="icon-btn refresh"
              @click="scanJobs"
              :disabled="scanning"
              :title="$t('jobs.dashboard.refresh')"
            >
              <Icon name="mdi:refresh" size="18" :class="{ spin: scanning }" />
            </button>
            <button
              class="icon-btn danger"
              @click="logout"
              :title="$t('jobs.dashboard.logout')"
            >
              <Icon name="mdi:logout" size="17" />
            </button>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat">
            <span class="stat-n">{{ filteredJobs.length }}</span>
            <span class="stat-l">{{ $t("jobs.dashboard.totalJobs") }}</span>
          </div>
          <div class="stat-sep" />
          <div class="stat">
            <span class="stat-n">{{ channelCount }}</span>
            <span class="stat-l">{{ $t("jobs.dashboard.channels") }}</span>
          </div>
          <div class="stat-sep" />
          <div class="stat">
            <span class="stat-n">{{ rangeLabel }}</span>
            <span class="stat-l">{{ $t("jobs.dashboard.range") }}</span>
          </div>
        </div>

        <!-- Keyword filter chips -->
        <div class="kw-filter-bar">
          <span class="kw-filter-label"
            >{{ $t("jobs.dashboard.filterKeywords") }}:</span
          >
          <div class="kw-chips">
            <button
              v-for="kw in keywords"
              :key="kw"
              class="kw-chip"
              :class="{ active: activeKeywords.includes(kw) }"
              @click="toggleKw(kw)"
            >
              {{ kw }}
            </button>
          </div>
        </div>

        <!-- Loading skeletons -->
        <div v-if="scanning" class="grid">
          <div v-for="n in 6" :key="n" class="skeleton-card">
            <div class="sk sk-s" />
            <div class="sk sk-l" />
            <div class="sk sk-m" />
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredJobs.length === 0" class="empty">
          <Icon
            name="mdi:briefcase-search-outline"
            size="52"
            class="empty-icon"
          />
          <p>{{ $t("jobs.dashboard.empty") }}</p>
          <button class="primary-btn sm" @click="scanJobs">
            {{ $t("jobs.dashboard.retry") }}
          </button>
        </div>

        <!-- Cards -->
        <div v-else class="grid">
          <div
            v-for="(job, i) in filteredJobs"
            :key="job.id"
            class="job-card"
            :style="{ animationDelay: `${i * 35}ms` }"
          >
            <div class="jc-head">
              <span class="ch-badge">
                <Icon name="mdi:telegram" size="13" />
                {{ job.channel }}
              </span>
              <span class="jc-time">
                <Icon name="mdi:clock-outline" size="12" />
                {{ job.time }}
              </span>
            </div>

            <p class="jc-text">{{ truncate(job.text, 300) }}</p>

            <div class="jc-kws">
              <span v-for="kw in job.matchedKeywords" :key="kw" class="mk">{{
                kw
              }}</span>
            </div>

            <div class="jc-foot">
              <a
                v-if="job.link"
                :href="job.link"
                target="_blank"
                class="jc-open"
              >
                <Icon name="mdi:open-in-new" size="14" />
                {{ $t("jobs.dashboard.open") }}
              </a>
              <button class="jc-copy" @click="copyText(job.text)">
                <Icon name="mdi:content-copy" size="14" />
                {{ $t("jobs.dashboard.copy") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ══════════════════════════════════════
         TOASTS
    ══════════════════════════════════════ -->
    <div class="toasts" :class="locale === 'ar' ? 'toasts-r' : 'toasts-l'">
      <transition-group name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="`toast-${t.type}`"
        >
          <Icon
            :name="
              {
                success: 'mdi:check-circle',
                error: 'mdi:alert-circle',
                info: 'mdi:information',
              }[t.type]
            "
            size="17"
          />
          {{ t.msg }}
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const { locale, t } = useI18n();
const { $toast } = useNuxtApp();

// ─── Range / limit options ────────────────────────────────────────────────────
const searchDays = ref(0); // 0 = today only
const msgLimit = ref(50);
const limitOptions = [50, 100, 200, 500];

const rangeOptions = computed(() => [
  {
    value: 0,
    label: t("jobs.setup.dateRangeToday"),
    shortLabel: t("jobs.dashboard.days_0"),
  },
  {
    value: 3,
    label: t("jobs.setup.dateRange3"),
    shortLabel: t("jobs.dashboard.days_3"),
  },
  {
    value: 7,
    label: t("jobs.setup.dateRange7"),
    shortLabel: t("jobs.dashboard.days_7"),
  },
  {
    value: 30,
    label: t("jobs.setup.dateRange30"),
    shortLabel: t("jobs.dashboard.days_30"),
  },
]);

const rangeLabel = computed(
  () =>
    rangeOptions.value.find((o) => o.value === searchDays.value)?.shortLabel ??
    "",
);

// ─── Guide steps ──────────────────────────────────────────────────────────────
const guideSteps = computed(() => [
  { title: t("jobs.guide.step1Title"), desc: t("jobs.guide.step1Desc") },
  { title: t("jobs.guide.step2Title"), desc: t("jobs.guide.step2Desc") },
  { title: t("jobs.guide.step3Title"), desc: t("jobs.guide.step3Desc") },
  { title: t("jobs.guide.step4Title"), desc: t("jobs.guide.step4Desc") },
  { title: t("jobs.guide.step5Title"), desc: t("jobs.guide.step5Desc") },
]);

// ─── State ────────────────────────────────────────────────────────────────────
const step = ref("setup");
const showGuide = ref(false);
const showSessionBanner = ref(false);
const form = reactive({ apiId: "", apiHash: "", phone: "" });
const keywords = ref(["مطلوب", "وظيفة", "تعيين", "vacancy", "hiring", "job"]);
const activeKeywords = ref([...keywords.value]);
const newKeyword = ref("");
const otpDigits = ref(["", "", "", "", ""]);
const otpRefs = ref([]);
const connecting = ref(false);
const signing = ref(false);
const scanning = ref(false);
const jobs = ref([]);
const toasts = ref([]);
let tgClient = null;
let tid = 0;

const channelCount = computed(
  () => new Set(jobs.value.map((j) => j.channel)).size,
);
const filteredJobs = computed(() => {
  if (!activeKeywords.value.length) return jobs.value;
  return jobs.value.filter((j) =>
    j.matchedKeywords.some((k) => activeKeywords.value.includes(k)),
  );
});

// ─── Toast helper ─────────────────────────────────────────────────────────────
const toast = (msg, type = "info") => {
  const id = tid++;
  toasts.value.push({ id, msg, type });
  setTimeout(
    () => (toasts.value = toasts.value.filter((x) => x.id !== id)),
    3500,
  );
};

// ─── OTP helpers ─────────────────────────────────────────────────────────────
const onOtpInput = (i) => {
  if (otpDigits.value[i] && i < 4) otpRefs.value[i + 1]?.focus();
};
const onOtpBackspace = (i) => {
  if (!otpDigits.value[i] && i > 0) {
    otpDigits.value[i - 1] = "";
    otpRefs.value[i - 1]?.focus();
  }
};

// ─── Keywords ────────────────────────────────────────────────────────────────
const addKeyword = () => {
  const kw = newKeyword.value.trim();
  if (kw && !keywords.value.includes(kw)) {
    keywords.value.push(kw);
    activeKeywords.value.push(kw);
  }
  newKeyword.value = "";
};
const removeKeyword = (kw) => {
  keywords.value = keywords.value.filter((k) => k !== kw);
  activeKeywords.value = activeKeywords.value.filter((k) => k !== kw);
};
const toggleKw = (kw) => {
  activeKeywords.value.includes(kw)
    ? (activeKeywords.value = activeKeywords.value.filter((k) => k !== kw))
    : activeKeywords.value.push(kw);
};

// ─── Session ─────────────────────────────────────────────────────────────────
onMounted(() => {
  const session = localStorage.getItem("tg_session");
  const creds = localStorage.getItem("tg_creds");
  if (session && creds) {
    const c = JSON.parse(creds);
    form.apiId = c.apiId;
    form.apiHash = c.apiHash;
    showSessionBanner.value = true;
  }
});

const restoreSession = async () => {
  showSessionBanner.value = false;
  const session = localStorage.getItem("tg_session");
  const creds = JSON.parse(localStorage.getItem("tg_creds"));
  try {
    tgClient = new TelegramClient(
      new StringSession(session),
      parseInt(creds.apiId),
      creds.apiHash,
      { connectionRetries: 3 },
    );
    await tgClient.connect();
    step.value = "jobs";
    toast(t("jobs.toast.sessionRestored"), "success");
    await scanJobs();
  } catch {
    clearSession();
  }
};

const clearSession = () => {
  showSessionBanner.value = false;
  localStorage.removeItem("tg_session");
  localStorage.removeItem("tg_creds");
};

// ─── Connect ─────────────────────────────────────────────────────────────────
const handleConnect = async () => {
  if (!form.apiId || !form.apiHash || !form.phone) {
    toast(t("jobs.toast.fillAll"), "error");
    return;
  }
  connecting.value = true;
  try {
    tgClient = new TelegramClient(
      new StringSession(""),
      parseInt(form.apiId),
      form.apiHash,
      { connectionRetries: 5 },
    );
    await tgClient.connect();
    await tgClient.sendCode(
      { apiId: parseInt(form.apiId), apiHash: form.apiHash },
      form.phone,
    );
    step.value = "otp";
    toast(t("jobs.toast.codeSent"), "info");
  } catch (e) {
    toast(t("jobs.toast.error") + ": " + e.message, "error");
  } finally {
    connecting.value = false;
  }
};

const handleSignIn = async () => {
  const code = otpDigits.value.join("");
  if (code.length < 5) return;
  signing.value = true;
  try {
    await tgClient.signInUser(
      { apiId: parseInt(form.apiId), apiHash: form.apiHash },
      {
        phoneNumber: form.phone,
        phoneCode: async () => code,
        onError: (e) => {
          throw e;
        },
      },
    );
    const session = tgClient.session.save();
    localStorage.setItem("tg_session", session);
    localStorage.setItem(
      "tg_creds",
      JSON.stringify({ apiId: form.apiId, apiHash: form.apiHash }),
    );
    step.value = "jobs";
    toast(t("jobs.toast.connected"), "success");
    await scanJobs();
  } catch (e) {
    toast(t("jobs.toast.error") + ": " + e.message, "error");
  } finally {
    signing.value = false;
  }
};

// ─── Scan ─────────────────────────────────────────────────────────────────────
const scanJobs = async () => {
  scanning.value = true;
  jobs.value = [];
  try {
    const dialogs = await tgClient.getDialogs({ limit: 200 });
    const channels = dialogs.filter((d) => d.isChannel || d.isGroup);

    // Build cutoff date based on searchDays
    const cutoff = new Date();
    if (searchDays.value === 0) {
      cutoff.setHours(0, 0, 0, 0); // start of today
    } else {
      cutoff.setDate(cutoff.getDate() - searchDays.value);
      cutoff.setHours(0, 0, 0, 0);
    }

    for (const ch of channels) {
      try {
        const msgs = await tgClient.getMessages(ch.entity, {
          limit: msgLimit.value,
        });
        for (const msg of msgs) {
          if (!msg.message) continue;
          const msgDate = new Date(msg.date * 1000);
          if (msgDate < cutoff) continue;
          const lower = msg.message.toLowerCase();
          const matched = keywords.value.filter((kw) =>
            lower.includes(kw.toLowerCase()),
          );
          if (matched.length) {
            jobs.value.push({
              id: `${ch.id}_${msg.id}`,
              channel: ch.title,
              text: msg.message,
              time: msgDate.toLocaleString(
                locale.value === "ar" ? "ar-EG" : "en-GB",
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
            });
          }
        }
      } catch {}
    }

    if (!jobs.value.length) toast(t("jobs.toast.noJobs"), "info");
  } catch {
    toast(t("jobs.toast.error"), "error");
  } finally {
    scanning.value = false;
  }
};

const logout = () => {
  clearSession();
  tgClient = null;
  jobs.value = [];
  step.value = "setup";
};

const truncate = (text, max) =>
  text?.length > max ? text.slice(0, max) + "…" : text;
const copyText = async (text) => {
  await navigator.clipboard.writeText(text);
  toast(t("jobs.toast.copied"), "success");
};
</script>

<style lang="scss" scoped>
.jobs-page {
  min-height: 100vh;
  background: var(--bg-page);
  font-family: "Tajawal", sans-serif;
  padding: 20px 16px 80px;
}

/* ── Session Banner ─────────────────────────────── */
.session-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
  padding: 14px 24px;
}
.session-banner-inner {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.session-banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.session-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(42, 171, 238, 0.1);
  color: #2aabee;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.session-banner-title {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}
.session-banner-sub {
  font-size: 0.8rem;
  color: var(--text-sub);
  margin-top: 2px;
}
.session-banner-actions {
  display: flex;
  gap: 8px;
}
.session-btn {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: "Tajawal", sans-serif;
  border: none;
  &.primary {
    background: #2aabee;
    color: #fff;
  }
  &.ghost {
    background: var(--bg-elevated);
    color: var(--text-sub);
    border: 1px solid var(--border-color);
  }
}

/* ── Centered wrap ──────────────────────────────── */
.centered-wrap {
  display: flex;
  justify-content: center;
  padding-top: 32px;
}

/* ── Card ───────────────────────────────────────── */
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 36px;
  width: 100%;
  max-width: 640px;
  box-shadow: 0 4px 28px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 24px;
  @media (max-width: 580px) {
    padding: 22px 16px;
  }
}

/* ── Card Hero ──────────────────────────────────── */
.card-hero {
  text-align: center;
}
.hero-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  margin: 0 auto 14px;
  &.tg-blue {
    background: linear-gradient(135deg, #2aabee, #1a85c8);
    box-shadow: 0 6px 20px rgba(42, 171, 238, 0.3);
  }
  &.purple {
    background: linear-gradient(135deg, #7c3aed, #5b21b6);
    box-shadow: 0 6px 20px rgba(124, 58, 237, 0.3);
  }
}
.card-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.card-sub {
  color: var(--text-sub);
  font-size: 0.92rem;
  margin: 0;
  line-height: 1.65;
}

/* ── Guide ──────────────────────────────────────── */
.guide-block {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
}
.guide-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 16px;
  background: var(--bg-elevated);
  border: none;
  cursor: pointer;
  font-family: "Tajawal", sans-serif;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  .guide-chevron {
    margin-inline-start: auto;
    color: var(--text-muted);
  }
}
.guide-steps {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.guide-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.guide-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2aabee;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}
.guide-step-title {
  font-weight: 700;
  font-size: 0.87rem;
  color: var(--text-primary);
  margin-bottom: 3px;
}
.guide-step-desc {
  font-size: 0.82rem;
  color: var(--text-sub);
  line-height: 1.5;
}
.guide-ext-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  padding: 5px 12px;
  background: rgba(42, 171, 238, 0.1);
  color: #2aabee;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  &:hover {
    background: rgba(42, 171, 238, 0.18);
  }
}

/* ── Form sections ──────────────────────────────── */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-sub);
  margin: 0;
}
.field-input {
  padding: 10px 13px;
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-size: 0.93rem;
  font-family: "Tajawal", sans-serif;
  width: 100%;
  box-sizing: border-box;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  &::placeholder {
    color: var(--text-muted);
  }
  &:focus {
    outline: none;
    border-color: #2aabee;
    box-shadow: 0 0 0 3px rgba(42, 171, 238, 0.13);
  }
}

/* ── Segmented control ──────────────────────────── */
.seg-control {
  display: flex;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}
.seg-btn {
  flex: 1;
  padding: 8px 4px;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.18s;
  &.active {
    background: #2aabee;
    color: #fff;
  }
}

/* ── Keywords ───────────────────────────────────── */
.kw-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 8px;
}
.kw-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--secondary-soft);
  color: var(--text-primary);
  border-radius: 20px;
  padding: 4px 11px;
  font-size: 0.8rem;
  font-weight: 500;
}
.kw-x {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  &:hover {
    color: #d32f2f;
  }
}
.kw-add-row {
  display: flex;
  gap: 8px;
}
.add-kw-btn {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: var(--border-color);
  }
}

/* ── Buttons ─────────────────────────────────────── */
.primary-btn {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #2aabee, #1a85c8);
  color: #fff;
  font-size: 0.97rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 16px rgba(42, 171, 238, 0.28);
  transition:
    opacity 0.2s,
    transform 0.15s;
  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &.sm {
    width: auto;
    padding: 9px 22px;
    font-size: 0.88rem;
  }
}
.ghost-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-family: "Tajawal", sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 0 auto;
  &:hover {
    color: var(--text-primary);
  }
}

/* ── Spinner ─────────────────────────────────────── */
.spin-ring {
  width: 17px;
  height: 17px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── OTP ─────────────────────────────────────────── */
.otp-card {
  align-items: center;
}
.otp-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.83rem;
  color: #7c3aed;
  align-self: stretch;
}
.otp-row {
  display: flex;
  gap: 10px;
}
.otp-box {
  width: 50px;
  height: 58px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-family: monospace;
  &:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  }
  @media (max-width: 360px) {
    width: 42px;
    height: 50px;
  }
}

/* ── Dashboard ───────────────────────────────────── */
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.dash-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}
.dash-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.live-dot {
  width: 9px;
  height: 9px;
  background: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
  animation: pulse-g 2s infinite;
}
@keyframes pulse-g {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
  }
  50% {
    box-shadow: 0 0 0 7px rgba(34, 197, 94, 0.05);
  }
}
.dash-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.dash-bar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.range-switch {
  display: flex;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}
.range-btn {
  padding: 7px 11px;
  font-size: 0.77rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.18s;
  &.active {
    background: #2aabee;
    color: #fff;
  }
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.18s;
  &.refresh:hover {
    color: #2aabee;
    border-color: #2aabee;
  }
  &.danger:hover {
    color: #d32f2f;
    border-color: #d32f2f;
  }
  &:disabled {
    opacity: 0.5;
  }
  .iconify.spin {
    animation: spin 0.8s linear infinite;
  }
}

/* ── Stats ───────────────────────────────────────── */
.stats-row {
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 14px 24px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 80px;
}
.stat-n {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--text-primary);
}
.stat-l {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 3px;
}
.stat-sep {
  width: 1px;
  background: var(--border-color);
  align-self: stretch;
  margin: 0 4px;
}

/* ── Keyword filter bar ─────────────────────────── */
.kw-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.kw-filter-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}
.kw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.kw-chip {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.18s;
  &.active {
    background: #2aabee;
    border-color: #2aabee;
    color: #fff;
  }
}

/* ── Grid ────────────────────────────────────────── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 14px;
}

/* ── Skeleton ────────────────────────────────────── */
.skeleton-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sk {
  height: 11px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--border-color) 25%,
    var(--bg-elevated) 50%,
    var(--border-color) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite;
}
.sk-s {
  width: 38%;
}
.sk-m {
  width: 65%;
}
.sk-l {
  width: 100%;
  height: 36px;
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* ── Empty ───────────────────────────────────────── */
.empty {
  text-align: center;
  padding: 70px 20px;
  color: var(--text-sub);
}
.empty-icon {
  color: var(--text-muted);
  margin-bottom: 14px;
}

/* ── Job card ────────────────────────────────────── */
.job-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  animation: card-in 0.32s ease both;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07);
    transform: translateY(-2px);
  }
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.jc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.ch-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(42, 171, 238, 0.1);
  color: #1a85c8;
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 0.76rem;
  font-weight: 600;
  max-width: 60%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.jc-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.73rem;
  color: var(--text-muted);
}
.jc-text {
  font-size: 0.87rem;
  color: var(--text-primary);
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.jc-kws {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.mk {
  padding: 2px 8px;
  background: rgba(211, 47, 47, 0.08);
  color: #d32f2f;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 600;
}
.jc-foot {
  display: flex;
  gap: 7px;
  border-top: 1px solid var(--border-color);
  padding-top: 11px;
  margin-top: auto;
}
.jc-open {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 13px;
  background: linear-gradient(135deg, #2aabee, #1a85c8);
  color: #fff !important;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.18s;
  &:hover {
    opacity: 0.87;
  }
}
.jc-copy {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 13px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-sub);
  cursor: pointer;
  font-family: "Tajawal", sans-serif;
  transition: background 0.18s;
  &:hover {
    background: var(--border-color);
  }
}

/* ── Toasts ──────────────────────────────────────── */
.toasts {
  position: fixed;
  bottom: 22px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.toasts-l {
  left: 22px;
}
.toasts-r {
  right: 22px;
}
.toast {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 16px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.13);
  pointer-events: none;
  &.toast-success {
    background: rgba(34, 197, 94, 0.13);
    color: #16a34a;
    border: 1px solid rgba(34, 197, 94, 0.22);
  }
  &.toast-error {
    background: rgba(239, 68, 68, 0.11);
    color: #dc2626;
    border: 1px solid rgba(239, 68, 68, 0.18);
  }
  &.toast-info {
    background: rgba(42, 171, 238, 0.11);
    color: #1a85c8;
    border: 1px solid rgba(42, 171, 238, 0.2);
  }
}
.toast-enter-active {
  transition: all 0.28s cubic-bezier(0.34, 1.5, 0.64, 1);
}
.toast-leave-active {
  transition: all 0.18s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

/* ── Page transitions ────────────────────────────── */
.fade-slide-enter-active {
  transition: all 0.32s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.fade-slide-leave-active {
  transition: all 0.18s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.fade-slide-leave-to {
  opacity: 0;
}
.fade-enter-active {
  transition: opacity 0.25s;
}
.fade-leave-active {
  transition: opacity 0.18s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-down-enter-active {
  transition: all 0.3s ease;
}
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-100%);
}
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 600px;
}
</style>
