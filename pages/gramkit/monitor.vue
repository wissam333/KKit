<template>
  <div class="tool-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div v-if="!isConnected" class="guard">
      <SharedUiFeedbackEmptyState
        icon="mdi:link-variant-off"
        title="gramkit.guard.title"
        description="gramkit.guard.desc"
        action-label="gramkit.guard.action"
        action-icon="mdi:arrow-left"
        :action-handler="() => navigateTo('/gramkit')"
      />
    </div>

    <template v-else>
      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="tool-header">
        <NuxtLink to="/gramkit" class="back-btn">
          <Icon name="mdi:arrow-left" size="16" />
        </NuxtLink>
        <div class="tool-header-icon orange">
          <Icon name="mdi:bell-ring-outline" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.tools.monitor.name") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.tools.monitor.desc") }}</p>
        </div>
        <div class="tool-header-actions">
          <SharedUiButtonBase
            v-if="!isRunning"
            icon-left="mdi:play"
            variant="success"
            :disabled="!monitorKeywords.length"
            @click="startMonitor"
          >
            {{ $t("gramkit.monitor.start") }}
          </SharedUiButtonBase>
          <SharedUiButtonBase
            v-else
            icon-left="mdi:stop"
            variant="error"
            @click="stopMonitor"
          >
            {{ $t("gramkit.monitor.stop") }}
          </SharedUiButtonBase>
        </div>
      </div>

      <!-- ── Status bar ─────────────────────────────────────── -->
      <div class="status-bar" :class="{ running: isRunning }">
        <div class="status-dot" />
        <span>{{
          isRunning ? $t("gramkit.monitor.running") : $t("gramkit.monitor.idle")
        }}</span>
        <span v-if="isRunning" class="status-pill">
          <Icon name="mdi:timer-outline" size="12" />
          {{ $t("gramkit.monitor.nextCheck") }}: {{ countdown }}s
        </span>
        <span v-if="isRunning" class="status-pill">
          <Icon name="mdi:refresh" size="12" />
          {{ $t("gramkit.monitor.checks") }}: {{ checkCount }}
        </span>
        <span v-if="isRunning" class="status-pill">
          <Icon name="mdi:telegram" size="12" />
          {{ $t("gramkit.monitor.channels") }}: {{ channelsSeen }}
        </span>
        <span v-if="alerts.length" class="status-pill alert-pill">
          <Icon name="mdi:bell-outline" size="12" />
          {{ alerts.length }}
        </span>
      </div>

      <!-- ── Settings card ──────────────────────────────────── -->
      <div class="settings-card">
        <div class="settings-row">
          <!-- Keywords -->
          <div class="field">
            <div class="field-label">{{ $t("gramkit.monitor.keywords") }}</div>
            <div class="kw-tags">
              <span v-for="kw in monitorKeywords" :key="kw" class="kw-tag">
                {{ kw }}
                <button class="kw-x" @click="removeKw(kw)">
                  <Icon name="mdi:close" size="11" />
                </button>
              </span>
            </div>
            <div class="kw-add-row">
              <SharedUiFormBaseInput
                v-model="newKw"
                :placeholder="$t('gramkit.monitor.addKw')"
                size="sm"
                @keyup.enter="addKw"
              />
              <SharedUiButtonBase
                icon-left="mdi:plus"
                size="sm"
                variant="outline"
                @click="addKw"
              >
                {{ $t("gramkit.monitor.add") }}
              </SharedUiButtonBase>
            </div>
          </div>

          <!-- Interval + limits -->
          <div class="field">
            <div class="field-label">{{ $t("gramkit.monitor.interval") }}</div>
            <div class="seg-control">
              <button
                v-for="opt in intervalOptions"
                :key="opt.value"
                class="seg-btn"
                :class="{ active: interval === opt.value }"
                :disabled="isRunning"
                @click="interval = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>

            <!-- Limits -->
            <div class="limits-mini">
              <div class="limit-mini-field">
                <span class="limit-mini-label">
                  <Icon name="mdi:antenna" size="12" />
                  {{ $t("gramkit.monitor.channelLimit") }}
                </span>
                <div class="limit-stepper" :class="{ disabled: isRunning }">
                  <button
                    class="step-btn"
                    :disabled="isRunning"
                    @click="dialogLimit = Math.max(50, dialogLimit - 50)"
                  >
                    −
                  </button>
                  <span class="step-val">{{ dialogLimit }}</span>
                  <button
                    class="step-btn"
                    :disabled="isRunning"
                    @click="dialogLimit = Math.min(500, dialogLimit + 50)"
                  >
                    +
                  </button>
                </div>
              </div>
              <div class="limit-mini-field">
                <span class="limit-mini-label">
                  <Icon name="mdi:message-outline" size="12" />
                  {{ $t("gramkit.monitor.msgLimit") }}
                </span>
                <div class="limit-stepper" :class="{ disabled: isRunning }">
                  <button
                    class="step-btn"
                    :disabled="isRunning"
                    @click="msgLimit = Math.max(5, msgLimit - 5)"
                  >
                    −
                  </button>
                  <span class="step-val">{{ msgLimit }}</span>
                  <button
                    class="step-btn"
                    :disabled="isRunning"
                    @click="msgLimit = Math.min(100, msgLimit + 5)"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Alerts header ──────────────────────────────────── -->
      <div class="alerts-header">
        <span class="alerts-title">{{ $t("gramkit.monitor.alerts") }}</span>
        <button v-if="alerts.length" class="clear-btn" @click="alerts = []">
          <Icon name="mdi:delete-sweep-outline" size="14" />
          {{ $t("gramkit.monitor.clearAll") }}
        </button>
      </div>

      <SharedUiFeedbackEmptyState
        v-if="!alerts.length"
        icon="mdi:bell-sleep-outline"
        title="gramkit.monitor.noAlerts"
        description="gramkit.monitor.noAlertsDesc"
        size="md"
      />

      <!-- ── Alert cards ────────────────────────────────────── -->
      <div class="alerts-list">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="alert-card"
          :class="{ new: alert.isNew }"
        >
          <div class="alert-head">
            <span class="alert-channel">
              <Icon name="mdi:telegram" size="12" /> {{ alert.channel }}
            </span>
            <span class="alert-time">{{ alert.time }}</span>
          </div>
          <p class="alert-text">{{ truncate(alert.text, 200) }}</p>
          <div class="alert-kws">
            <span v-for="kw in alert.keywords" :key="kw" class="alert-kw">{{
              kw
            }}</span>
          </div>
          <div class="alert-foot">
            <a
              v-if="alert.link"
              :href="alert.link"
              target="_blank"
              class="jc-open"
            >
              <Icon name="mdi:open-in-new" size="13" />
              {{ $t("gramkit.jobs.open") }}
            </a>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, getSession, getCreds } = useTelegram();

// ── State ────────────────────────────────────────────────────
const isRunning = ref(false);
const checkCount = ref(0);
const channelsSeen = ref(0);
const countdown = ref(0);
const monitorKeywords = ref(["مطلوب", "وظيفة", "vacancy", "hiring"]);
const newKw = ref("");
const interval = ref(120);
const dialogLimit = ref(200);
const msgLimit = ref(20);
const alerts = ref([]);

let timer = null;
let countdownTimer = null;
// seenIds lives only in memory — never sent back in full, only delta is returned
let seenIds = new Set();
let alertId = 0;

const intervalOptions = [
  { value: 60, label: "1m" },
  { value: 120, label: "2m" },
  { value: 300, label: "5m" },
  { value: 600, label: "10m" },
];

// ── Keywords ─────────────────────────────────────────────────
const addKw = () => {
  const kw = newKw.value.trim();
  if (kw && !monitorKeywords.value.includes(kw)) monitorKeywords.value.push(kw);
  newKw.value = "";
};
const removeKw = (kw) => {
  monitorKeywords.value = monitorKeywords.value.filter((k) => k !== kw);
};

// ── Check ────────────────────────────────────────────────────
const runCheck = async () => {
  try {
    const result = await $fetch("/api/tg/monitor/check", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        keywords: monitorKeywords.value,
        lookbackSeconds: interval.value * 2, // always look back 2× the interval
        dialogLimit: dialogLimit.value,
        msgLimit: msgLimit.value,
        // Send only the IDs we've accumulated — server returns only NEW ones
        seenIds: [...seenIds],
        locale: locale.value,
      },
    });

    // Merge the delta returned by the server into our local set
    for (const id of result.newSeenIds ?? []) seenIds.add(id);

    // Cap seenIds size to avoid memory creep on long runs (keep newest 5000)
    if (seenIds.size > 5000) {
      const arr = [...seenIds];
      seenIds = new Set(arr.slice(arr.length - 5000));
    }

    for (const hit of result.hits) {
      const newAlert = { id: alertId++, ...hit, isNew: true };
      alerts.value.unshift(newAlert);
      $toast.success(`🔔 ${hit.channel}: ${hit.keywords.join(", ")}`);
      // Remove "new" highlight after 3s
      setTimeout(() => {
        newAlert.isNew = false;
      }, 3000);
    }

    checkCount.value++;
    // Track how many distinct channels we've actually scanned so far
    channelsSeen.value = seenIds.size
      ? new Set([...seenIds].map((k) => k.split("_")[0])).size
      : 0;
  } catch {
    /* silent — monitor keeps running */
  }
};

// ── Start / stop ─────────────────────────────────────────────
const startMonitor = async () => {
  if (!monitorKeywords.value.length) {
    $toast.error(t("gramkit.monitor.noKeywords"));
    return;
  }
  isRunning.value = true;
  checkCount.value = 0;
  channelsSeen.value = 0;
  seenIds = new Set();
  alerts.value = [];

  await runCheck();

  timer = setInterval(runCheck, interval.value * 1000);

  countdown.value = interval.value;
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) countdown.value = interval.value;
  }, 1000);
};

const stopMonitor = () => {
  isRunning.value = false;
  clearInterval(timer);
  clearInterval(countdownTimer);
  timer = null;
  countdownTimer = null;
};

// ── Cleanup on unmount ────────────────────────────────────────
onUnmounted(() => {
  clearInterval(timer);
  clearInterval(countdownTimer);
});

const truncate = (text, max) =>
  text?.length > max ? text.slice(0, max) + "…" : text;
</script>

<style scoped lang="scss">
.tool-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 16px 80px;
  font-family: "Tajawal", sans-serif;
}
.guard {
  display: flex;
  justify-content: center;
  padding-top: 80px;
}

/* ─── Header ─────────────────────────────────────────────────── */
.tool-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-decoration: none;
  flex-shrink: 0;
  &:hover {
    color: var(--text-primary);
  }
}
.tool-header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.orange {
    background: rgba(249, 115, 22, 0.1);
    color: #f97316;
    border: 1.5px solid rgba(249, 115, 22, 0.2);
  }
}
.tool-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px;
}
.tool-sub {
  font-size: 0.8rem;
  color: var(--text-sub);
  margin: 0;
}
.tool-header-actions {
  margin-inline-start: auto;
}

/* ─── Status bar ─────────────────────────────────────────────── */
.status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 0.83rem;
  color: var(--text-sub);
  transition:
    border-color 0.3s,
    background 0.3s;
  &.running {
    border-color: rgba(34, 197, 94, 0.4);
    background: rgba(34, 197, 94, 0.04);
    color: #16a34a;
  }
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--border-color);
  flex-shrink: 0;
  .running & {
    background: #22c55e;
    animation: pulse 1.5s infinite;
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
  }
}
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.05);
  }
}
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  padding: 2px 8px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 6px;
  &.alert-pill {
    background: rgba(249, 115, 22, 0.12);
    color: #f97316;
  }
}

/* ─── Settings card ──────────────────────────────────────────── */
.settings-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 18px;
  margin-bottom: 20px;
}
.settings-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-sub);
}

.kw-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.kw-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 0.78rem;
  color: var(--text-primary);
}
.kw-x {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--text-muted);
  display: flex;
  &:hover {
    color: #d32f2f;
  }
}
.kw-add-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

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
    background: #f97316;
    color: #fff;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* ─── Limits mini row ────────────────────────────────────────── */
.limits-mini {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.limit-mini-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.limit-mini-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  flex: 1;
}
.limit-stepper {
  display: flex;
  align-items: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 7px;
  overflow: hidden;
  &.disabled {
    opacity: 0.45;
    pointer-events: none;
  }
}
.step-btn {
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: var(--border-color);
    color: var(--text-primary);
  }
  &:disabled {
    cursor: not-allowed;
  }
}
.step-val {
  min-width: 36px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* ─── Alerts ─────────────────────────────────────────────────── */
.alerts-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.alerts-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}
.clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-family: "Tajawal", sans-serif;
  &:hover {
    color: #d32f2f;
  }
}

.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.alert-card {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.3s;
  &.new {
    border-color: rgba(34, 197, 94, 0.5);
    background: rgba(34, 197, 94, 0.02);
    animation: pop-in 0.4s cubic-bezier(0.34, 1.5, 0.64, 1) both;
  }
}
@keyframes pop-in {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(-8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.alert-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.alert-channel {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(42, 171, 238, 0.1);
  color: #1a85c8;
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 0.74rem;
  font-weight: 600;
}
.alert-time {
  font-size: 0.72rem;
  color: var(--text-muted);
}
.alert-text {
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}
.alert-kws {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.alert-kw {
  padding: 2px 8px;
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
  border-radius: 6px;
  font-size: 0.71rem;
  font-weight: 600;
}
.alert-foot {
  display: flex;
  gap: 6px;
}
.jc-open {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: linear-gradient(135deg, #2aabee, #1a85c8);
  color: #fff !important;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.18s;
  &:hover {
    opacity: 0.87;
  }
}
</style>
