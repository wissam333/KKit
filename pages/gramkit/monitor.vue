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
      <div class="tool-header">
        <NuxtLink to="/gramkit" class="back-btn"
          ><Icon name="mdi:arrow-left" size="16"
        /></NuxtLink>
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
            @click="startMonitor"
            >{{ $t("gramkit.monitor.start") }}</SharedUiButtonBase
          >
          <SharedUiButtonBase
            v-else
            icon-left="mdi:stop"
            variant="error"
            @click="stopMonitor"
            >{{ $t("gramkit.monitor.stop") }}</SharedUiButtonBase
          >
        </div>
      </div>

      <!-- Status bar -->
      <div class="status-bar" :class="{ running: isRunning }">
        <div class="status-dot" />
        <span>{{
          isRunning ? $t("gramkit.monitor.running") : $t("gramkit.monitor.idle")
        }}</span>
        <span v-if="isRunning" class="next-check"
          >{{ $t("gramkit.monitor.nextCheck") }}: {{ countdown }}s</span
        >
        <span v-if="isRunning" class="check-count"
          >{{ $t("gramkit.monitor.checks") }}: {{ checkCount }}</span
        >
      </div>

      <!-- Settings -->
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
                >{{ $t("gramkit.monitor.add") }}</SharedUiButtonBase
              >
            </div>
          </div>

          <!-- Interval -->
          <div class="field">
            <div class="field-label">{{ $t("gramkit.monitor.interval") }}</div>
            <div class="seg-control">
              <button
                v-for="opt in intervalOptions"
                :key="opt.value"
                class="seg-btn"
                :class="{ active: interval === opt.value }"
                @click="interval = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Alerts -->
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
import { useTelegram } from "~/composables/useTelegram";

const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, getDialogs, getMessages } = useTelegram();

const isRunning = ref(false);
const checkCount = ref(0);
const countdown = ref(0);
const monitorKeywords = ref(["مطلوب", "وظيفة", "vacancy", "hiring"]);
const newKw = ref("");
const interval = ref(120); // seconds
const alerts = ref([]);
let timer = null;
let countdownTimer = null;
let seenIds = new Set();
let alertId = 0;

const intervalOptions = [
  { value: 60, label: "1m" },
  { value: 120, label: "2m" },
  { value: 300, label: "5m" },
  { value: 600, label: "10m" },
];

const addKw = () => {
  const kw = newKw.value.trim();
  if (kw && !monitorKeywords.value.includes(kw)) monitorKeywords.value.push(kw);
  newKw.value = "";
};
const removeKw = (kw) => {
  monitorKeywords.value = monitorKeywords.value.filter((k) => k !== kw);
};

const runCheck = async () => {
  try {
    const dialogs = await getDialogs({ limit: 200 });
    const cutoff = new Date(Date.now() - interval.value * 2 * 1000); // look back 2x interval
    for (const ch of dialogs) {
      try {
        const msgs = await getMessages(ch.entity, { limit: 20 });
        for (const msg of msgs) {
          if (!msg.message) continue;
          if (new Date(msg.date * 1000) < cutoff) continue;
          const msgKey = `${ch.id}_${msg.id}`;
          if (seenIds.has(msgKey)) continue;
          seenIds.add(msgKey);
          const lower = msg.message.toLowerCase();
          const matched = monitorKeywords.value.filter((kw) =>
            lower.includes(kw.toLowerCase()),
          );
          if (matched.length) {
            alerts.value.unshift({
              id: alertId++,
              channel: ch.title,
              text: msg.message,
              time: new Date(msg.date * 1000).toLocaleString(
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
              keywords: matched,
              isNew: true,
            });
            $toast.success(`🔔 ${ch.title}: ${matched.join(", ")}`);
            setTimeout(() => {
              if (alerts.value[0]) alerts.value[0].isNew = false;
            }, 3000);
          }
        }
      } catch {}
    }
    checkCount.value++;
  } catch {}
};

const startMonitor = async () => {
  if (!monitorKeywords.value.length) {
    $toast.error(t("gramkit.monitor.noKeywords"));
    return;
  }
  isRunning.value = true;
  seenIds = new Set();
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
};

const truncate = (text, max) =>
  text?.length > max ? text.slice(0, max) + "…" : text;

onUnmounted(() => {
  clearInterval(timer);
  clearInterval(countdownTimer);
});

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

/* Status bar */
.status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: var(--text-sub);
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
.next-check,
.check-count {
  font-size: 0.78rem;
  padding: 2px 8px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 6px;
}

/* Settings card */
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
}

/* Alerts */
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
