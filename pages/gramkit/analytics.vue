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
        <div class="tool-header-icon purple">
          <Icon name="mdi:chart-bar" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.tools.analytics.name") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.tools.analytics.desc") }}</p>
        </div>
      </div>

      <!-- ── Channel picker ─────────────────────────────────── -->
      <div class="picker-row">
        <SharedUiFormBaseSelect
          v-model="selectedChannel"
          :options="channelOptions"
          :placeholder="$t('gramkit.analytics.pickChannel')"
          :loading="loadingDialogs"
          icon-left="mdi:telegram"
          searchable
          class="channel-select"
        />
        <SharedUiButtonBase
          :loading="analyzing"
          :disabled="!selectedChannel"
          icon-left="mdi:chart-bar"
          @click="runAnalysis"
        >
          {{ $t("gramkit.analytics.analyze") }}
        </SharedUiButtonBase>
      </div>

      <!-- ── Controls row ───────────────────────────────────── -->
      <div class="controls-row">
        <!-- Date range -->
        <div class="control-group">
          <span class="ctrl-label">
            <Icon name="mdi:calendar-range" size="13" />
            {{ $t("gramkit.analytics.range") }}
          </span>
          <div class="range-switch">
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

        <div class="ctrl-sep" />

        <!-- Message limit -->
        <div class="control-group">
          <span class="ctrl-label">
            <Icon name="mdi:message-text-outline" size="13" />
            {{ $t("gramkit.analytics.msgLimit") }}
          </span>
          <div class="limit-stepper">
            <button
              class="step-btn"
              @click="msgLimit = Math.max(50, msgLimit - 50)"
            >
              −
            </button>
            <span class="step-val">{{ msgLimit }}</span>
            <button
              class="step-btn"
              @click="msgLimit = Math.min(1000, msgLimit + 50)"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <!-- ── Loading ────────────────────────────────────────── -->
      <div v-if="analyzing" class="analyze-loading">
        <SharedUiIndicatorsProgress type="spinner" color="primary" size="md" />
        <span>{{ $t("gramkit.analytics.loading") }}</span>
      </div>

      <!-- ── Results ────────────────────────────────────────── -->
      <template v-if="result && !analyzing">
        <!-- Stats cards -->
        <SharedUiCardsStats :stats="statCards" :columns="3" :icon-size="24" />

        <!-- Peak hour banner -->
        <div class="peak-banner">
          <Icon name="mdi:clock-fast" size="20" />
          {{ $t("gramkit.analytics.peakHour") }}:
          <strong>{{ peakLabel }}</strong>
        </div>

        <!-- Hour activity chart -->
        <div class="chart-card">
          <div class="chart-title">
            {{ $t("gramkit.analytics.activityByHour") }}
          </div>
          <div class="hour-chart">
            <div
              v-for="(count, h) in result.byHour"
              :key="h"
              class="hour-bar-wrap"
              :title="`${h}:00 — ${count} msgs`"
            >
              <div
                class="hour-bar"
                :style="{ height: `${barHeight(count)}%` }"
                :class="{ peak: h === result.peakHour }"
              />
              <div class="hour-label">{{ h % 3 === 0 ? h : "" }}</div>
            </div>
          </div>
        </div>

        <!-- Daily activity chart -->
        <div v-if="result.dailyActivity?.length > 1" class="chart-card">
          <div class="chart-title">
            {{ $t("gramkit.analytics.activityByDay") }}
          </div>
          <div class="day-chart">
            <div
              v-for="d in result.dailyActivity"
              :key="d.date"
              class="day-bar-wrap"
              :title="`${d.date} — ${d.count} msgs`"
            >
              <div
                class="day-bar"
                :style="{ height: `${dayBarHeight(d.count)}%` }"
              />
              <div class="day-label">{{ shortDate(d.date) }}</div>
            </div>
          </div>
        </div>

        <!-- Top words -->
        <div class="chart-card">
          <div class="chart-title">{{ $t("gramkit.analytics.topWords") }}</div>
          <div class="word-list">
            <div
              v-for="(w, i) in result.topWords"
              :key="w.word"
              class="word-row"
            >
              <span class="word-rank">#{{ i + 1 }}</span>
              <span class="word-text">{{ w.word }}</span>
              <div class="word-bar-wrap">
                <div
                  class="word-bar"
                  :style="{
                    width: `${(w.count / result.topWords[0].count) * 100}%`,
                  }"
                />
              </div>
              <span class="word-count">{{ w.count }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- ── Empty state ────────────────────────────────────── -->
      <SharedUiFeedbackEmptyState
        v-if="!result && !analyzing"
        icon="mdi:chart-bar"
        title="gramkit.analytics.empty"
        description="gramkit.analytics.emptyDesc"
        size="lg"
      />
    </template>
  </div>
</template>

<script setup>
const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, getSession, getCreds } = useTelegram();

// ── Picker ───────────────────────────────────────────────────
const selectedChannel = ref(null);
const loadingDialogs = ref(false);
const dialogs = ref([]);

const channelOptions = computed(() =>
  dialogs.value.map((d) => ({
    label: d.title,
    value: d.id,
    icon: "mdi:bullhorn-outline",
  })),
);

// ── Controls ─────────────────────────────────────────────────
const searchDays = ref(0);
const msgLimit = ref(200);

const rangeOptions = computed(() => [
  { value: 0, label: t("gramkit.range.all") },
  { value: 7, label: t("gramkit.range.7days") },
  { value: 30, label: t("gramkit.range.30days") },
  { value: 90, label: t("gramkit.range.90days") },
]);

// ── Analysis state ───────────────────────────────────────────
const analyzing = ref(false);
const result = ref(null);

// ── Derived ──────────────────────────────────────────────────
const statCards = computed(() =>
  !result.value
    ? []
    : [
        {
          key: "msgs",
          label: "gramkit.analytics.stats.msgs",
          value: result.value.totalMessages,
          icon: "mdi:message-text-outline",
          color: "blue",
        },
        {
          key: "peak",
          label: "gramkit.analytics.stats.peak",
          value: peakLabel.value,
          icon: "mdi:clock-outline",
          color: "purple",
        },
        {
          key: "words",
          label: "gramkit.analytics.stats.words",
          value: result.value.topWords.length,
          icon: "mdi:text-box-outline",
          color: "green",
        },
      ],
);

const peakLabel = computed(() => {
  if (!result.value) return "";
  const h = result.value.peakHour;
  return `${String(h).padStart(2, "0")}:00 – ${String(h + 1).padStart(2, "0")}:00`;
});

const maxHourCount = computed(() =>
  result.value ? Math.max(...result.value.byHour, 1) : 1,
);
const barHeight = (count) =>
  Math.max(4, Math.round((count / maxHourCount.value) * 100));

const maxDayCount = computed(() =>
  result.value?.dailyActivity?.length
    ? Math.max(...result.value.dailyActivity.map((d) => d.count), 1)
    : 1,
);
const dayBarHeight = (count) =>
  Math.max(4, Math.round((count / maxDayCount.value) * 100));

// Show only first 3 chars of date (e.g. "Apr 3" → "Apr")
const shortDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(locale.value === "ar" ? "ar-EG" : "en-GB", {
    month: "short",
    day: "numeric",
  });
};

// ── Load dialogs on mount ─────────────────────────────────────
onMounted(async () => {
  if (!isConnected.value) return;
  loadingDialogs.value = true;
  try {
    dialogs.value = await $fetch("/api/tg/analytics/dialogs", {
      method: "POST",
      body: { ...getCreds(), session: getSession() },
    });
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    loadingDialogs.value = false;
  }
});

// ── Run analysis ──────────────────────────────────────────────
const runAnalysis = async () => {
  if (!selectedChannel.value) return;
  analyzing.value = true;
  result.value = null;
  try {
    result.value = await $fetch("/api/tg/analytics/analyzeChannel", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        channelId: selectedChannel.value,
        msgLimit: msgLimit.value,
        searchDays: searchDays.value,
      },
    });
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    analyzing.value = false;
  }
};
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
  &.purple {
    background: rgba(124, 58, 237, 0.1);
    color: #7c3aed;
    border: 1.5px solid rgba(124, 58, 237, 0.2);
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

/* ─── Picker row ─────────────────────────────────────────────── */
.picker-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.channel-select {
  flex: 1;
  min-width: 220px;
}

/* ─── Controls row ───────────────────────────────────────────── */
.controls-row {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}
.ctrl-sep {
  width: 1px;
  height: 28px;
  background: var(--border-color);
  flex-shrink: 0;
  @media (max-width: 520px) {
    display: none;
  }
}
.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 180px;
}
.ctrl-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  cursor: default;
}

/* ─── Range switch ───────────────────────────────────────────── */
.range-switch {
  display: flex;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-inline-start: auto;
}
.seg-btn {
  padding: 5px 9px;
  font-size: 0.72rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.18s;
  white-space: nowrap;
  &.active {
    background: #7c3aed;
    color: #fff;
  }
}

/* ─── Limit stepper ──────────────────────────────────────────── */
.limit-stepper {
  display: flex;
  align-items: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-inline-start: auto;
}
.step-btn {
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  &:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }
}
.step-val {
  min-width: 44px;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

/* ─── Loading ────────────────────────────────────────────────── */
.analyze-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  padding: 60px;
  color: var(--text-sub);
  font-size: 0.9rem;
}

/* ─── Peak banner ────────────────────────────────────────────── */
.peak-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(124, 58, 237, 0.07);
  border: 1px solid rgba(124, 58, 237, 0.18);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.88rem;
  color: #7c3aed;
  margin-bottom: 16px;
  strong {
    font-weight: 700;
  }
}

/* ─── Chart card ─────────────────────────────────────────────── */
.chart-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}
.chart-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

/* ─── Hour chart ─────────────────────────────────────────────── */
.hour-chart {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
}
.hour-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}
.hour-bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: var(--border-color);
  transition: height 0.4s ease;
  &.peak {
    background: #7c3aed;
  }
}
.hour-label {
  font-size: 0.6rem;
  color: var(--text-muted);
}

/* ─── Day chart ──────────────────────────────────────────────── */
.day-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 100px;
  overflow-x: auto;
}
.day-bar-wrap {
  flex-shrink: 0;
  min-width: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}
.day-bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: linear-gradient(180deg, #2aabee, #1a85c8);
  transition: height 0.4s ease;
}
.day-label {
  font-size: 0.56rem;
  color: var(--text-muted);
  white-space: nowrap;
  max-width: 36px;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}

/* ─── Word list ──────────────────────────────────────────────── */
.word-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.word-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.word-rank {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  width: 24px;
  flex-shrink: 0;
}
.word-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  width: 110px;
  flex-shrink: 0;
  direction: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.word-bar-wrap {
  flex: 1;
  height: 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
  overflow: hidden;
}
.word-bar {
  height: 100%;
  background: linear-gradient(90deg, #2aabee, #7c3aed);
  border-radius: 4px;
  transition: width 0.5s ease;
}
.word-count {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-sub);
  width: 34px;
  text-align: end;
  flex-shrink: 0;
}
</style>
