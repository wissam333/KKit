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
      <!-- Header -->
      <div class="tool-header">
        <NuxtLink to="/gramkit" class="back-btn"
          ><Icon name="mdi:arrow-left" size="16"
        /></NuxtLink>
        <div class="tool-header-icon purple">
          <Icon name="mdi:chart-bar" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.tools.analytics.name") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.tools.analytics.desc") }}</p>
        </div>
      </div>

      <!-- Channel picker -->
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
          >{{ $t("gramkit.analytics.analyze") }}</SharedUiButtonBase
        >
      </div>

      <!-- Loading -->
      <div v-if="analyzing" class="analyze-loading">
        <SharedUiIndicatorsProgress type="spinner" color="primary" size="md" />
        <span>{{ $t("gramkit.analytics.loading") }}</span>
      </div>

      <!-- Results -->
      <template v-if="result && !analyzing">
        <!-- Stats cards -->
        <SharedUiCardsStats :stats="statCards" :columns="3" :icon-size="24" />

        <!-- Peak hour -->
        <div class="peak-banner">
          <Icon name="mdi:clock-fast" size="20" />
          {{ $t("gramkit.analytics.peakHour") }}:
          <strong>{{ peakLabel }}</strong>
        </div>

        <!-- Hour chart -->
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

      <!-- Empty state -->
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

const selectedChannel = ref(null);
const loadingDialogs = ref(false);
const analyzing = ref(false);
const result = ref(null);
const dialogs = ref([]);

const channelOptions = computed(() =>
  dialogs.value.map((d) => ({
    label: d.title,
    value: d.id?.toString(),
    icon: d.isChannel ? "mdi:bullhorn-outline" : "mdi:account-group-outline",
  })),
);

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

const maxCount = computed(() =>
  result.value ? Math.max(...result.value.byHour, 1) : 1,
);
const barHeight = (count) =>
  Math.max(4, Math.round((count / maxCount.value) * 100));

onMounted(async () => {
  if (!isConnected.value) return;
  loadingDialogs.value = true;
  try {
    dialogs.value = await $fetch("/api/tg/dialogs", {
      method: "POST",
      body: { ...getCreds(), session: getSession() },
    });
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    loadingDialogs.value = false;
  }
});

const runAnalysis = async () => {
  if (!selectedChannel.value) return;
  analyzing.value = true;
  result.value = null;
  try {
    result.value = await $fetch("/api/tg/analyzeChannel", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        channelId: selectedChannel.value,
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
.tool-header {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 24px;
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

.picker-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.channel-select {
  flex: 1;
  min-width: 220px;
}

.analyze-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
  padding: 60px;
  color: var(--text-sub);
  font-size: 0.9rem;
}

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

/* ── Hour chart ──────────────────────────────────── */
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

/* ── Word list ───────────────────────────────────── */
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
  width: 100px;
  flex-shrink: 0;
  direction: auto;
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
  width: 30px;
  text-align: end;
  flex-shrink: 0;
}
</style>
