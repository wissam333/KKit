<template>
  <div class="gramkit-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <!-- ══════════ CONNECT GATE ══════════ -->
    <transition name="fade-slide">
      <div v-if="!isConnected && step === 'connect'" class="centered-wrap">
        <div class="connect-card">
          <div class="card-hero">
            <div class="hero-icon">
              <Icon name="mdi:telegram" size="32" />
            </div>
            <h1 class="card-title">GramKit</h1>
            <p class="card-sub">{{ $t("gramkit.subtitle") }}</p>
          </div>

          <div class="guide-block">
            <button class="guide-toggle" @click="showGuide = !showGuide">
              <Icon name="mdi:help-circle-outline" size="15" />
              <span>{{
                showGuide ? $t("gramkit.guide.hide") : $t("gramkit.guide.show")
              }}</span>
              <Icon
                :name="showGuide ? 'mdi:chevron-up' : 'mdi:chevron-down'"
                size="15"
                class="ms-auto"
              />
            </button>
            <transition name="expand">
              <div v-if="showGuide" class="guide-steps">
                <div v-for="(s, i) in guideSteps" :key="i" class="guide-step">
                  <div class="guide-num">{{ i + 1 }}</div>
                  <div>
                    <div class="guide-step-title">{{ s.title }}</div>
                    <div class="guide-step-desc">{{ s.desc }}</div>
                    <a
                      v-if="i === 0"
                      href="https://my.telegram.org"
                      target="_blank"
                      class="guide-link"
                    >
                      <Icon name="mdi:open-in-new" size="12" /> my.telegram.org
                    </a>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <div class="form-grid-2">
            <SharedUiFormBaseInput
              v-model="form.apiId"
              :label="$t('gramkit.form.apiId')"
              placeholder="12345678"
              dir="ltr"
              icon-left="mdi:identifier"
            />
            <SharedUiFormBaseInput
              v-model="form.apiHash"
              :label="$t('gramkit.form.apiHash')"
              placeholder="a1b2c3d4e5f6..."
              dir="ltr"
              icon-left="mdi:key-outline"
            />
          </div>
          <SharedUiFormBaseInput
            v-model="form.phone"
            :label="$t('gramkit.form.phone')"
            placeholder="+971501234567"
            type="tel"
            dir="ltr"
            icon-left="mdi:phone-outline"
          />

          <SharedUiButtonBase
            :loading="connecting"
            icon-left="mdi:link-variant"
            size="lg"
            class="w-100"
            @click="handleConnect"
          >
            {{ $t("gramkit.form.connect") }}
          </SharedUiButtonBase>
        </div>
      </div>
    </transition>

    <!-- ══════════ OTP ══════════ -->
    <transition name="fade-slide">
      <div v-if="step === 'otp'" class="centered-wrap">
        <div class="connect-card otp-card">
          <div class="card-hero">
            <div class="hero-icon purple">
              <Icon name="mdi:shield-lock-outline" size="32" />
            </div>
            <h2 class="card-title">{{ $t("gramkit.otp.title") }}</h2>
            <p class="card-sub">
              {{ $t("gramkit.otp.subtitle") }}
              <strong dir="ltr">{{ form.phone }}</strong>
            </p>
          </div>

          <div class="otp-hint">
            <Icon name="mdi:information-outline" size="14" />
            {{ $t("gramkit.otp.hint") }}
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

          <SharedUiButtonBase
            :loading="signing"
            :disabled="otpDigits.join('').length < 5"
            icon-left="mdi:check-circle-outline"
            size="lg"
            class="w-100"
            @click="handleSignIn"
          >
            {{ $t("gramkit.otp.verify") }}
          </SharedUiButtonBase>

          <button class="ghost-link" @click="step = 'connect'">
            <Icon name="mdi:arrow-left" size="13" />
            {{ $t("gramkit.otp.back") }}
          </button>
        </div>
      </div>
    </transition>

    <!-- ══════════ DASHBOARD ══════════ -->
    <transition name="fade">
      <div v-if="isConnected && step === 'dashboard'" class="dashboard">
        <div class="dash-topbar">
          <div class="dash-topbar-left">
            <div class="brand-dot" />
            <span class="brand-name">GramKit</span>
          </div>
          <button
            class="icon-btn"
            :title="$t('gramkit.logout')"
            @click="handleLogout"
          >
            <Icon name="mdi:logout" size="16" />
          </button>
        </div>

        <div class="tools-intro">
          <h2 class="tools-heading">{{ $t("gramkit.tools.heading") }}</h2>
          <p class="tools-sub">{{ $t("gramkit.tools.sub") }}</p>
        </div>

        <div class="tools-grid">
          <NuxtLink
            v-for="tool in tools"
            :key="tool.route"
            :to="tool.route"
            class="tool-card"
            :class="`tool-card--${tool.color}`"
          >
            <div class="tool-icon">
              <Icon :name="tool.icon" size="24" />
            </div>
            <div class="tool-info">
              <div class="tool-name">{{ $t(tool.name) }}</div>
              <div class="tool-desc">{{ $t(tool.desc) }}</div>
            </div>
            <Icon
              :name="
                $i18n.locale === 'ar' ? 'mdi:chevron-left' : 'mdi:chevron-right'
              "
              size="16"
              class="tool-arrow"
            />
          </NuxtLink>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { useTelegram } from "~/composables/useTelegram";

const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { connect, getSession, disconnect, isConnected } = useTelegram();

const step = ref("connect");
const showGuide = ref(false);
const connecting = ref(false);
const signing = ref(false);
const form = reactive({ apiId: "", apiHash: "", phone: "" });
const otpDigits = ref(["", "", "", "", ""]);
const otpRefs = ref([]);
let tgClient = null;

const tools = [
  {
    route: "/gramkit/jobs",
    icon: "mdi:briefcase-search-outline",
    name: "gramkit.tools.jobs.name",
    desc: "gramkit.tools.jobs.desc",
    color: "blue",
  },
  {
    route: "/gramkit/analytics",
    icon: "mdi:chart-bar",
    name: "gramkit.tools.analytics.name",
    desc: "gramkit.tools.analytics.desc",
    color: "purple",
  },
  {
    route: "/gramkit/monitor",
    icon: "mdi:bell-ring-outline",
    name: "gramkit.tools.monitor.name",
    desc: "gramkit.tools.monitor.desc",
    color: "orange",
  },
  {
    route: "/gramkit/cleaner",
    icon: "mdi:broom",
    name: "gramkit.tools.cleaner.name",
    desc: "gramkit.tools.cleaner.desc",
    color: "red",
  },
  {
    route: "/gramkit/members",
    icon: "mdi:account-group-outline",
    name: "gramkit.tools.members.name",
    desc: "gramkit.tools.members.desc",
    color: "green",
  },
  {
    route: "/gramkit/media",
    icon: "mdi:image-multiple-outline",
    name: "gramkit.tools.media.name",
    desc: "gramkit.tools.media.desc",
    color: "teal",
  },
  {
    route: "/gramkit/wrapped",
    icon: "mdi:chart-timeline-variant-shimmer",
    name: "gramkit.tools.wrapped.name",
    desc: "gramkit.tools.wrapped.desc",
    color: "violet",
  },
  {
    route: "/gramkit/archiver",
    icon: "mdi:archive-arrow-down-outline",
    name: "gramkit.tools.archiver.name",
    desc: "gramkit.tools.archiver.desc",
    color: "indigo",
  },
  {
    route: "/gramkit/saves",
    icon: "mdi:bookmark-multiple-outline",
    name: "gramkit.tools.saves.name",
    desc: "gramkit.tools.saves.desc",
    color: "amber",
  },
];

const guideSteps = computed(() => [
  { title: t("gramkit.guide.step1Title"), desc: t("gramkit.guide.step1Desc") },
  { title: t("gramkit.guide.step2Title"), desc: t("gramkit.guide.step2Desc") },
  { title: t("gramkit.guide.step3Title"), desc: t("gramkit.guide.step3Desc") },
]);

const onOtpInput = (i) => {
  if (otpDigits.value[i] && i < 4) otpRefs.value[i + 1]?.focus();
};
const onOtpBackspace = (i) => {
  if (!otpDigits.value[i] && i > 0) {
    otpDigits.value[i - 1] = "";
    otpRefs.value[i - 1]?.focus();
  }
};

onMounted(async () => {
  if (isConnected.value) {
    step.value = "dashboard";
    return;
  }
  const session = localStorage.getItem("tg_session");
  const creds = localStorage.getItem("tg_creds");
  if (session && creds) {
    const c = JSON.parse(creds);
    form.apiId = c.apiId;
    form.apiHash = c.apiHash;
    try {
      await connect({ apiId: c.apiId, apiHash: c.apiHash, session });
      step.value = "dashboard";
      $toast.success(t("gramkit.toast.sessionRestored"));
    } catch {
      clearSavedSession();
    }
  }
});

const clearSavedSession = () => {
  localStorage.removeItem("tg_session");
  localStorage.removeItem("tg_creds");
};

const handleConnect = async () => {
  if (!form.apiId || !form.apiHash || !form.phone) {
    $toast.error(t("gramkit.toast.fillAll"));
    return;
  }
  connecting.value = true;
  try {
    const { TelegramClient } = await import("telegram");
    const { StringSession } = await import("telegram/sessions");
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
    $toast.info(t("gramkit.toast.codeSent"));
  } catch (e) {
    $toast.error(t("gramkit.toast.error") + ": " + e.message);
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
    await connect({
      apiId: form.apiId,
      apiHash: form.apiHash,
      session: tgClient.session.save(),
    });
    localStorage.setItem("tg_session", getSession());
    localStorage.setItem(
      "tg_creds",
      JSON.stringify({ apiId: form.apiId, apiHash: form.apiHash }),
    );
    step.value = "dashboard";
    $toast.success(t("gramkit.toast.connected"));
  } catch (e) {
    $toast.error(t("gramkit.toast.error") + ": " + e.message);
  } finally {
    signing.value = false;
  }
};

const handleLogout = () => {
  disconnect();
  clearSavedSession();
  step.value = "connect";
};

watch(isConnected, (v) => {
  if (v) step.value = "dashboard";
});
</script>

<style scoped lang="scss">
.gramkit-page {
  min-height: 100dvh;
  background: var(--bg-page);
  font-family: "Tajawal", sans-serif;
  padding: 24px 20px 80px;

  @media (max-width: 480px) {
    padding: 16px 12px 60px;
  }
}

/* ── Centered wrapper ────────────────────────────────────────── */
.centered-wrap {
  display: flex;
  justify-content: center;
  padding-top: 24px;
}

/* ── Connect card ────────────────────────────────────────────── */
.connect-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 32px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 4px 28px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  gap: 18px;

  @media (max-width: 560px) {
    padding: 20px 16px;
    border-radius: 16px;
  }
}

/* ── Hero ────────────────────────────────────────────────────── */
.card-hero {
  text-align: center;
}

.hero-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2aabee, #1a85c8);
  box-shadow: 0 6px 20px rgba(42, 171, 238, 0.3);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;

  &.purple {
    background: linear-gradient(135deg, #7c3aed, #5b21b6);
    box-shadow: 0 6px 20px rgba(124, 58, 237, 0.3);
  }
}

.card-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 6px;

  @media (max-width: 480px) {
    font-size: 1.3rem;
  }
}

.card-sub {
  color: var(--text-sub);
  font-size: 0.88rem;
  margin: 0;
  line-height: 1.6;
}

/* ── Guide block ─────────────────────────────────────────────── */
.guide-block {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.guide-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  background: var(--bg-elevated);
  border: none;
  cursor: pointer;
  font-family: "Tajawal", sans-serif;
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-primary);
}

.ms-auto {
  margin-inline-start: auto;
}

.guide-steps {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.guide-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #2aabee;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.guide-step-title {
  font-weight: 700;
  font-size: 0.83rem;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.guide-step-desc {
  font-size: 0.78rem;
  color: var(--text-sub);
  line-height: 1.5;
}

.guide-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 5px;
  padding: 3px 9px;
  background: rgba(42, 171, 238, 0.1);
  color: #2aabee;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 600;
  text-decoration: none;
}

/* ── Form grid ───────────────────────────────────────────────── */
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.w-100 {
  width: 100%;
}

/* ── OTP ─────────────────────────────────────────────────────── */
.otp-card {
  align-items: center;
}

.otp-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(124, 58, 237, 0.08);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 10px;
  padding: 9px 13px;
  font-size: 0.8rem;
  color: #7c3aed;
  align-self: stretch;
}

.otp-row {
  display: flex;
  gap: 8px;

  @media (max-width: 360px) {
    gap: 5px;
  }
}

.otp-box {
  width: 46px;
  height: 54px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-elevated);
  color: var(--text-primary);
  font-family: monospace;

  @media (max-width: 360px) {
    width: 38px;
    height: 46px;
    font-size: 1.2rem;
  }

  &:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  }
}

.ghost-link {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-family: "Tajawal", sans-serif;
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0 auto;
  &:hover {
    color: var(--text-primary);
  }
}

/* ── Dashboard ───────────────────────────────────────────────── */
.dashboard {
  max-width: 960px;
  margin: 0 auto;
}

.dash-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.dash-topbar-left {
  display: flex;
  align-items: center;
  gap: 9px;
}

.brand-dot {
  width: 9px;
  height: 9px;
  background: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
  }
  50% {
    box-shadow: 0 0 0 7px rgba(34, 197, 94, 0.05);
  }
}

.brand-name {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
}

.icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  cursor: pointer;
  color: var(--text-muted);
  &:hover {
    color: #d32f2f;
    border-color: #d32f2f;
  }
}

/* ── Tools intro ─────────────────────────────────────────────── */
.tools-intro {
  margin-bottom: 20px;
}
.tools-heading {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.tools-sub {
  font-size: 0.84rem;
  color: var(--text-sub);
  margin: 0;
}

/* ── Tools grid ──────────────────────────────────────────────── */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 9px;
  }
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
  text-decoration: none;
  transition: all 0.2s;
  animation: card-in 0.3s ease both;

  @media (max-width: 480px) {
    padding: 13px;
    gap: 11px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
    border-color: var(--tool-color);
    .tool-arrow {
      opacity: 1;
      transform: translateX(3px);
    }
  }

  // Color variants
  &--blue {
    --tool-color: #2aabee;
  }
  &--purple {
    --tool-color: #7c3aed;
  }
  &--orange {
    --tool-color: #f97316;
  }
  &--red {
    --tool-color: #ef4444;
  }
  &--green {
    --tool-color: #22c55e;
  }
  &--teal {
    --tool-color: #14b8a6;
  }
  &--violet {
    --tool-color: #8b5cf6;
  }
  &--indigo {
    --tool-color: #6366f1;
  }
  &--amber {
    --tool-color: #f59e0b;
  }
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tool-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tool-color);
  border: 1.5px solid rgba(0, 0, 0, 0.06);

  @media (max-width: 480px) {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;

  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
}

.tool-desc {
  font-size: 0.76rem;
  color: var(--text-sub);
  line-height: 1.4;

  @media (max-width: 480px) {
    font-size: 0.72rem;
  }
}

.tool-arrow {
  color: var(--text-muted);
  opacity: 0.4;
  flex-shrink: 0;
  transition: all 0.2s;
}

/* ── Transitions ─────────────────────────────────────────────── */
.fade-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.fade-slide-leave-active {
  transition: all 0.18s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(16px);
}
.fade-slide-leave-to {
  opacity: 0;
}

.fade-enter-active {
  transition: opacity 0.22s;
}
.fade-leave-active {
  transition: opacity 0.16s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.22s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
}
</style>
