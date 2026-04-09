<template>
  <div class="tool-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div v-if="!isConnected" class="guard">
      <SharedUiFeedbackEmptyState
        icon="mdi:chart-timeline-variant-shimmer"
        title="gramkit.guard.title"
        description="gramkit.guard.desc"
        action-label="gramkit.guard.action"
        action-icon="mdi:arrow-left"
        :action-handler="() => navigateTo('/gramkit')"
      />
    </div>

    <template v-else>
      <div class="tool-header">
        <NuxtLink to="/gramkit" class="back-btn">
          <Icon name="mdi:arrow-left" size="16" />
        </NuxtLink>
        <div class="tool-header-icon wrapped">
          <Icon name="mdi:chart-timeline-variant-shimmer" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.wrapped.title") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.wrapped.subtitle") }}</p>
        </div>
        <div class="ms-auto">
          <SharedUiButtonBase
            v-if="!result"
            :loading="loading"
            icon-left="mdi:play-circle-outline"
            @click="generate"
            >{{ $t("gramkit.wrapped.generate") }}</SharedUiButtonBase
          >
          <SharedUiButtonBase
            v-else
            icon-left="mdi:refresh"
            variant="outline"
            @click="result = null"
            >{{ $t("gramkit.wrapped.regenerate") }}</SharedUiButtonBase
          >
        </div>
      </div>

      <!-- Period selector -->
      <div v-if="!result" class="period-picker">
        <div class="period-label">{{ $t("gramkit.wrapped.period") }}</div>
        <div class="seg-control">
          <button
            v-for="p in periods"
            :key="p.value"
            class="seg-btn"
            :class="{ active: period === p.value }"
            @click="period = p.value"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-wrap">
        <SharedUiIndicatorsProgress
          type="linear"
          :value="progress"
          color="primary"
          :show-value="true"
        />
        <p class="loading-msg">{{ loadingMsg }}</p>
      </div>

      <!-- Results -->
      <div v-if="result && !loading" class="wrapped-results">
        <!-- Hero -->
        <div class="hero-card">
          <div class="hero-bg" />
          <div class="hero-content">
            <div class="hero-avatar">
              <Icon name="mdi:account-circle" size="48" />
            </div>
            <div class="hero-name">{{ result.myName }}</div>
            <div class="hero-period">{{ periodLabel }}</div>
            <div class="hero-tagline">
              {{ $t("gramkit.wrapped.heroTagline") }}
            </div>
          </div>
        </div>

        <!-- Primary stats grid -->
        <div class="wrapped-grid">
          <div class="wcard wcard--blue">
            <div class="wcard-icon">
              <Icon name="mdi:message-text-outline" size="26" />
            </div>
            <div class="wcard-num">{{ result.totalSent.toLocaleString() }}</div>
            <div class="wcard-label">
              {{ $t("gramkit.wrapped.stats.sent") }}
            </div>
          </div>
          <div class="wcard wcard--purple">
            <div class="wcard-icon">
              <Icon name="mdi:message-arrow-left-outline" size="26" />
            </div>
            <div class="wcard-num">
              {{ result.totalReceived.toLocaleString() }}
            </div>
            <div class="wcard-label">
              {{ $t("gramkit.wrapped.stats.received") }}
            </div>
          </div>
          <div class="wcard wcard--green">
            <div class="wcard-icon">
              <Icon name="mdi:calendar-check-outline" size="26" />
            </div>
            <div class="wcard-num">{{ result.activeDays }}</div>
            <div class="wcard-label">
              {{ $t("gramkit.wrapped.stats.activeDays") }}
            </div>
          </div>
          <div class="wcard wcard--orange">
            <div class="wcard-icon">
              <Icon name="mdi:telescope" size="26" />
            </div>
            <div class="wcard-num">{{ result.channelsRead }}</div>
            <div class="wcard-label">
              {{ $t("gramkit.wrapped.stats.channelsRead") }}
            </div>
          </div>
          <div class="wcard wcard--teal">
            <div class="wcard-icon">
              <Icon name="mdi:image-outline" size="26" />
            </div>
            <div class="wcard-num">{{ result.mediaSent.toLocaleString() }}</div>
            <div class="wcard-label">
              {{ $t("gramkit.wrapped.stats.media") }}
            </div>
          </div>
          <div class="wcard wcard--red">
            <div class="wcard-icon">
              <Icon name="mdi:trending-up" size="26" />
            </div>
            <div class="wcard-num">{{ result.avgPerDay }}</div>
            <div class="wcard-label">
              {{ $t("gramkit.wrapped.stats.avgPerDay") }}
            </div>
          </div>
        </div>

        <!-- Secondary stats row -->
        <div class="secondary-stats">
          <div class="sstat">
            <Icon name="mdi:fire" size="18" class="sstat-icon orange" />
            <div class="sstat-num">{{ result.longestStreak }}</div>
            <div class="sstat-label">
              {{ $t("gramkit.wrapped.stats.streak") }}
            </div>
          </div>
          <div class="sstat">
            <Icon name="mdi:link-variant" size="18" class="sstat-icon blue" />
            <div class="sstat-num">{{ result.linksSent }}</div>
            <div class="sstat-label">
              {{ $t("gramkit.wrapped.stats.links") }}
            </div>
          </div>
          <div class="sstat">
            <Icon name="mdi:format-size" size="18" class="sstat-icon purple" />
            <div class="sstat-num">{{ result.avgCharsPerMsg }}</div>
            <div class="sstat-label">
              {{ $t("gramkit.wrapped.stats.avgChars") }}
            </div>
          </div>
          <div class="sstat">
            <Icon name="mdi:reply-outline" size="18" class="sstat-icon teal" />
            <div class="sstat-num">{{ result.responseRate }}%</div>
            <div class="sstat-label">
              {{ $t("gramkit.wrapped.stats.responseRate") }}
            </div>
          </div>
          <div class="sstat">
            <Icon
              name="mdi:account-group-outline"
              size="18"
              class="sstat-icon green"
            />
            <div class="sstat-num">{{ result.groupsActive }}</div>
            <div class="sstat-label">
              {{ $t("gramkit.wrapped.stats.groups") }}
            </div>
          </div>
        </div>

        <!-- Peak time insight -->
        <div class="insight-card">
          <div class="insight-icon">
            <Icon
              :name="
                result.peakHour >= 20 || result.peakHour < 6
                  ? 'mdi:moon-waning-crescent'
                  : result.peakHour < 12
                    ? 'mdi:weather-sunny'
                    : 'mdi:weather-partly-cloudy'
              "
              size="28"
            />
          </div>
          <div>
            <div class="insight-title">
              {{
                result.peakHour >= 20 || result.peakHour < 6
                  ? $t("gramkit.wrapped.nightOwl")
                  : result.peakHour < 12
                    ? $t("gramkit.wrapped.earlyBird")
                    : $t("gramkit.wrapped.afternoonPerson")
              }}
            </div>
            <div class="insight-desc">
              {{
                $t("gramkit.wrapped.peakDesc", {
                  hour: formatHour(result.peakHour),
                })
              }}
              ·
              {{
                $t("gramkit.wrapped.peakDay", { day: result.peakWeekdayName })
              }}
            </div>
          </div>
        </div>

        <!-- Hour chart -->
        <div class="section-card">
          <div class="section-title">
            <Icon name="mdi:clock-time-four-outline" size="18" />
            {{ $t("gramkit.wrapped.activityByHour") }}
          </div>
          <div class="hour-chart">
            <div
              v-for="(count, h) in result.byHour"
              :key="h"
              class="hour-col"
              :title="`${h}:00 — ${count}`"
            >
              <div
                class="hour-bar"
                :class="{ peak: h === result.peakHour }"
                :style="{ height: `${barH(count, result.byHour)}%` }"
              />
              <div class="hour-lbl">{{ h % 4 === 0 ? h : "" }}</div>
            </div>
          </div>
        </div>

        <!-- Weekday chart -->
        <div class="section-card">
          <div class="section-title">
            <Icon name="mdi:calendar-week-outline" size="18" />
            {{ $t("gramkit.wrapped.activityByDay") }}
          </div>
          <div class="weekday-chart">
            <div
              v-for="(count, i) in result.byWeekday"
              :key="i"
              class="wd-col"
              :title="`${weekdayNames[i]} — ${count}`"
            >
              <div
                class="wd-bar"
                :class="{ peak: i === result.peakWeekday }"
                :style="{ height: `${barH(count, result.byWeekday)}%` }"
              />
              <div class="wd-lbl">{{ weekdayShort[i] }}</div>
            </div>
          </div>
        </div>

        <!-- Top contacts with sent/received split -->
        <div v-if="result.topContacts.length" class="section-card">
          <div class="section-title">
            <Icon name="mdi:account-heart-outline" size="18" />
            {{ $t("gramkit.wrapped.topContacts") }}
          </div>
          <div class="contact-list">
            <div
              v-for="(c, i) in result.topContacts"
              :key="c.name"
              class="contact-row"
            >
              <div class="contact-rank" :class="`rank-${i + 1}`">
                <Icon
                  v-if="i < 3"
                  :name="['mdi:trophy', 'mdi:medal', 'mdi:medal-outline'][i]"
                  size="16"
                />
                <span v-else>{{ i + 1 }}</span>
              </div>
              <div class="contact-name">{{ c.name }}</div>
              <div class="contact-bar-wrap">
                <div
                  class="contact-bar contact-bar--sent"
                  :style="{
                    width: `${(c.sent / result.topContacts[0].count) * 100}%`,
                  }"
                />
                <div
                  class="contact-bar contact-bar--recv"
                  :style="{
                    width: `${(c.received / result.topContacts[0].count) * 100}%`,
                  }"
                />
              </div>
              <div class="contact-count">{{ c.count }}</div>
            </div>
          </div>
          <div class="contact-legend">
            <span class="legend-dot sent" />{{ $t("gramkit.wrapped.sent") }}
            <span class="legend-dot recv" />{{ $t("gramkit.wrapped.received") }}
          </div>
        </div>

        <!-- Top emojis -->
        <div v-if="result.topEmojis.length" class="section-card">
          <div class="section-title">
            <Icon name="mdi:emoticon-outline" size="18" />
            {{ $t("gramkit.wrapped.topEmojis") }}
          </div>
          <div class="emoji-row">
            <div
              v-for="e in result.topEmojis"
              :key="e.emoji"
              class="emoji-chip"
            >
              <span class="emoji-glyph">{{ e.emoji }}</span>
              <span class="emoji-count">{{ e.count }}</span>
            </div>
          </div>
        </div>

        <!-- Top words -->
        <div v-if="result.topWords.length" class="section-card">
          <div class="section-title">
            <Icon name="mdi:format-quote-close" size="18" />
            {{ $t("gramkit.wrapped.topWords") }}
          </div>
          <div class="words-cloud">
            <span
              v-for="(w, i) in result.topWords"
              :key="w.word"
              class="word-tag"
              :style="{
                fontSize: `${wordSize(i)}rem`,
                opacity: wordOpacity(i),
              }"
              >{{ w.word }}</span
            >
          </div>
        </div>

        <!-- Most active day -->
        <div
          v-if="result.mostActiveDay"
          class="insight-card insight-card--green"
        >
          <div class="insight-icon"><Icon name="mdi:fire" size="28" /></div>
          <div>
            <div class="insight-title">
              {{ $t("gramkit.wrapped.mostActiveDay") }}
            </div>
            <div class="insight-big">{{ result.mostActiveDay.date }}</div>
            <div class="insight-desc">
              {{ result.mostActiveDay.count }}
              {{ $t("gramkit.wrapped.messages") }}
            </div>
          </div>
        </div>

        <!-- Personality -->
        <div class="personality-card">
          <div class="personality-icon">{{ result.personality.emoji }}</div>
          <div class="personality-title">{{ result.personality.title }}</div>
          <div class="personality-desc">{{ result.personality.desc }}</div>
        </div>
      </div>

      <SharedUiFeedbackEmptyState
        v-if="!result && !loading"
        icon="mdi:chart-timeline-variant-shimmer"
        title="gramkit.wrapped.empty"
        description="gramkit.wrapped.emptyDesc"
        size="lg"
      />
    </template>
  </div>
</template>

<script setup>
const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, getSession, getCreds } = useTelegram();

const loading = ref(false);
const progress = ref(0);
const loadingMsg = ref("");
const result = ref(null);
const period = ref(30);

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const weekdayShort = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const periods = computed(() => [
  { value: 7, label: t("gramkit.wrapped.period7") },
  { value: 30, label: t("gramkit.wrapped.period30") },
  { value: 90, label: t("gramkit.wrapped.period90") },
  { value: 365, label: t("gramkit.wrapped.period365") },
]);
const periodLabel = computed(
  () => periods.value.find((p) => p.value === period.value)?.label ?? "",
);

const loadingMsgs = computed(() => [
  t("gramkit.wrapped.loading1"),
  t("gramkit.wrapped.loading2"),
  t("gramkit.wrapped.loading3"),
  t("gramkit.wrapped.loading4"),
]);

const formatHour = (h) => `${String(h).padStart(2, "0")}:00`;
const barH = (count, arr) =>
  Math.max(4, Math.round((count / Math.max(...arr, 1)) * 100));
const wordSize = (i) => Math.max(0.75, 1.4 - i * 0.05);
const wordOpacity = (i) => Math.max(0.5, 1 - i * 0.03);

const getPersonality = (data) => {
  if (data.peakHour >= 22 || data.peakHour < 4)
    return {
      emoji: "🦉",
      title: t("gramkit.wrapped.personality.nightOwl"),
      desc: t("gramkit.wrapped.personality.nightOwlDesc"),
    };
  if (data.peakHour < 8)
    return {
      emoji: "🐦",
      title: t("gramkit.wrapped.personality.earlyBird"),
      desc: t("gramkit.wrapped.personality.earlyBirdDesc"),
    };
  if (data.avgCharsPerMsg > 120)
    return {
      emoji: "✍️",
      title: t("gramkit.wrapped.personality.novelist"),
      desc: t("gramkit.wrapped.personality.novelistDesc"),
    };
  if (data.mediaSent > data.totalSent * 0.35)
    return {
      emoji: "📸",
      title: t("gramkit.wrapped.personality.visualStoryteller"),
      desc: t("gramkit.wrapped.personality.visualDesc"),
    };
  if (data.linksSent > 30)
    return {
      emoji: "🔗",
      title: t("gramkit.wrapped.personality.curator"),
      desc: t("gramkit.wrapped.personality.curatorDesc"),
    };
  if (data.totalSent > 600)
    return {
      emoji: "💬",
      title: t("gramkit.wrapped.personality.chatterbox"),
      desc: t("gramkit.wrapped.personality.chatterboxDesc"),
    };
  if (data.channelsRead > 30)
    return {
      emoji: "📰",
      title: t("gramkit.wrapped.personality.newsJunkie"),
      desc: t("gramkit.wrapped.personality.newsDesc"),
    };
  if (data.longestStreak >= 14)
    return {
      emoji: "🔥",
      title: t("gramkit.wrapped.personality.consistent"),
      desc: t("gramkit.wrapped.personality.consistentDesc"),
    };
  return {
    emoji: "🧘",
    title: t("gramkit.wrapped.personality.mindful"),
    desc: t("gramkit.wrapped.personality.mindfulDesc"),
  };
};

const generate = async () => {
  loading.value = true;
  progress.value = 0;
  result.value = null;
  loadingMsg.value = loadingMsgs.value[0];

  // Cycle loading messages while waiting
  const msgInterval = setInterval(() => {
    const idx = Math.floor(Math.random() * loadingMsgs.value.length);
    loadingMsg.value = loadingMsgs.value[idx];
    progress.value = Math.min(progress.value + 3, 90);
  }, 2000);

  try {
    const data = await $fetch("/api/tg/wrapped/generate", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        period: period.value,
        locale: locale.value,
      },
      timeout: 180000,
    });
    data.personality = getPersonality(data);
    progress.value = 100;
    await new Promise((r) => setTimeout(r, 300));
    result.value = data;
  } catch (e) {
    $toast.error(
      t("gramkit.toast.error") + ": " + (e.data?.message ?? e.message),
    );
  } finally {
    clearInterval(msgInterval);
    loading.value = false;
  }
};
</script>

<style scoped lang="scss">
.tool-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px 16px 80px;
  font-family: "Tajawal", sans-serif;
}
.guard {
  display: flex;
  justify-content: center;
  padding-top: 80px;
}
.ms-auto {
    margin-left: 0 !important;
  margin-inline-start: auto !important;

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
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &.wrapped {
    background: linear-gradient(
      135deg,
      rgba(124, 58, 237, 0.15),
      rgba(42, 171, 238, 0.15)
    );
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

.period-picker {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.period-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
}
.seg-control {
  display: flex;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}
.seg-btn {
  padding: 8px 14px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.18s;
  &.active {
    background: #7c3aed;
    color: #fff;
  }
}
.loading-wrap {
  padding: 40px 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.loading-msg {
  font-size: 0.85rem;
  color: var(--text-sub);
  text-align: center;
  margin: 0;
}

/* Hero */
.hero-card {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 20px;
  padding: 48px 32px;
  text-align: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
}
.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(124, 58, 237, 0.12),
    rgba(42, 171, 238, 0.08),
    rgba(34, 197, 94, 0.06)
  );
  pointer-events: none;
}
.hero-content {
  position: relative;
  z-index: 1;
}
.hero-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin: 0 auto 12px;
  background: linear-gradient(135deg, #7c3aed, #2aabee);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
}
.hero-name {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.hero-period {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 10px;
}
.hero-tagline {
  font-size: 0.9rem;
  color: var(--text-sub);
}

/* Primary grid */
.wrapped-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 14px;
  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
}
.wcard {
  border-radius: 16px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  border: 1.5px solid transparent;
  animation: card-in 0.4s ease both;
  &--blue {
    background: rgba(42, 171, 238, 0.08);
    border-color: rgba(42, 171, 238, 0.2);
    color: #2aabee;
  }
  &--purple {
    background: rgba(124, 58, 237, 0.08);
    border-color: rgba(124, 58, 237, 0.2);
    color: #7c3aed;
  }
  &--green {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.2);
    color: #16a34a;
  }
  &--orange {
    background: rgba(249, 115, 22, 0.08);
    border-color: rgba(249, 115, 22, 0.2);
    color: #f97316;
  }
  &--teal {
    background: rgba(20, 184, 166, 0.08);
    border-color: rgba(20, 184, 166, 0.2);
    color: #14b8a6;
  }
  &--red {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.wcard-num {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}
.wcard-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-sub);
}

/* Secondary stats row */
.secondary-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.sstat {
  flex: 1;
  min-width: 90px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
}
.sstat-icon {
  &.orange {
    color: #f97316;
  }
  &.blue {
    color: #2aabee;
  }
  &.purple {
    color: #7c3aed;
  }
  &.teal {
    color: #14b8a6;
  }
  &.green {
    color: #16a34a;
  }
}
.sstat-num {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}
.sstat-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
}

/* Insight */
.insight-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  &--green {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.04);
  }
}
.insight-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  flex-shrink: 0;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--text-primary);
}
.insight-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.insight-big {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
}
.insight-desc {
  font-size: 0.82rem;
  color: var(--text-sub);
}

/* Section card */
.section-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

/* Hour chart */
.hour-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 100px;
}
.hour-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  height: 100%;
  justify-content: flex-end;
}
.hour-bar {
  width: 100%;
  border-radius: 3px 3px 0 0;
  background: var(--border-color);
  transition: height 0.5s ease;
  &.peak {
    background: linear-gradient(180deg, #7c3aed, #2aabee);
  }
}
.hour-lbl {
  font-size: 0.55rem;
  color: var(--text-muted);
}

/* Weekday chart */
.weekday-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 80px;
}
.wd-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  height: 100%;
  justify-content: flex-end;
}
.wd-bar {
  width: 100%;
  border-radius: 4px 4px 0 0;
  background: var(--border-color);
  transition: height 0.5s ease;
  &.peak {
    background: linear-gradient(180deg, #f97316, #f59e0b);
  }
}
.wd-lbl {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--text-muted);
}

/* Contacts */
.contact-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.contact-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.contact-rank {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  background: var(--bg-elevated);
  color: var(--text-muted);
  &.rank-1 {
    background: rgba(255, 193, 7, 0.15);
    color: #f59e0b;
  }
  &.rank-2 {
    background: rgba(156, 163, 175, 0.2);
    color: #6b7280;
  }
  &.rank-3 {
    background: rgba(180, 83, 9, 0.12);
    color: #b45309;
  }
}
.contact-name {
  width: 120px;
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.contact-bar-wrap {
  flex: 1;
  height: 8px;
  background: var(--bg-elevated);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.contact-bar {
  border-radius: 2px;
  transition: width 0.6s ease;
  min-height: 3px;
  &--sent {
    background: #7c3aed;
    height: 4px;
  }
  &--recv {
    background: #2aabee;
    height: 4px;
  }
}
.contact-count {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-sub);
  width: 34px;
  text-align: end;
  flex-shrink: 0;
}
.contact-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  font-size: 0.74rem;
  color: var(--text-muted);
  font-weight: 600;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
  &.sent {
    background: #7c3aed;
  }
  &.recv {
    background: #2aabee;
  }
}

/* Emojis */
.emoji-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.emoji-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
}
.emoji-glyph {
  font-size: 1.6rem;
  line-height: 1;
}
.emoji-count {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
}

/* Word cloud */
.words-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.word-tag {
  padding: 4px 12px;
  border-radius: 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-weight: 600;
  cursor: default;
  &:hover {
    background: rgba(124, 58, 237, 0.1);
    border-color: rgba(124, 58, 237, 0.3);
  }
}

/* Personality */
.personality-card {
  background: linear-gradient(
    135deg,
    rgba(124, 58, 237, 0.1),
    rgba(42, 171, 238, 0.08)
  );
  border: 1.5px solid rgba(124, 58, 237, 0.25);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  margin-bottom: 16px;
}
.personality-icon {
  font-size: 3rem;
  margin-bottom: 10px;
  line-height: 1;
}
.personality-title {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.personality-desc {
  font-size: 0.88rem;
  color: var(--text-sub);
  line-height: 1.6;
  max-width: 400px;
  margin: 0 auto;
}
</style>
