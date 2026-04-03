<template>
  <div class="tool-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <!-- Not connected guard -->
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
        <NuxtLink to="/gramkit" class="back-btn">
          <Icon name="mdi:arrow-left" size="16" />
        </NuxtLink>
        <div class="tool-header-icon blue">
          <Icon name="mdi:briefcase-search-outline" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.tools.jobs.name") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.tools.jobs.desc") }}</p>
        </div>
        <div class="tool-header-actions">
          <div class="range-switch">
            <button
              v-for="opt in rangeOptions"
              :key="opt.value"
              class="range-btn"
              :class="{ active: searchDays === opt.value }"
              @click="searchDays = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
          <SharedUiButtonBase
            :loading="scanning"
            icon-left="mdi:refresh"
            variant="outline"
            size="sm"
            @click="scanJobs"
            >{{ $t("gramkit.jobs.scan") }}</SharedUiButtonBase
          >
        </div>
      </div>

      <!-- Progress bar while scanning -->
      <div v-if="scanning" class="scan-progress">
        <SharedUiIndicatorsProgress
          type="linear"
          :value="scanProgress"
          color="primary"
          :show-value="true"
          size="sm"
        />
        <span class="scan-label"
          >{{ $t("gramkit.jobs.scanning") }} {{ scanDone }}/{{
            scanTotal
          }}</span
        >
      </div>

      <!-- Stats -->
      <SharedUiCardsStats
        v-if="!scanning && jobs.length"
        :stats="statsCards"
        :columns="3"
        :icon-size="24"
      />

      <!-- Keyword filter chips -->
      <div v-if="jobs.length" class="kw-filter-bar">
        <span class="kw-label">{{ $t("gramkit.jobs.filter") }}:</span>
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

      <!-- Keyword manager -->
      <div class="kw-manager">
        <div class="kw-tags">
          <span v-for="kw in keywords" :key="kw" class="kw-tag">
            {{ kw }}
            <button class="kw-x" @click="removeKeyword(kw)">
              <Icon name="mdi:close" size="11" />
            </button>
          </span>
        </div>
        <div class="kw-add-row">
          <SharedUiFormBaseInput
            v-model="newKeyword"
            :placeholder="$t('gramkit.jobs.keywordPlaceholder')"
            size="sm"
            @keyup.enter="addKeyword"
          />
          <SharedUiButtonBase
            icon-left="mdi:plus"
            size="sm"
            variant="outline"
            @click="addKeyword"
          >
            {{ $t("gramkit.jobs.addKeyword") }}
          </SharedUiButtonBase>
        </div>
      </div>

      <!-- Empty state -->
      <SharedUiFeedbackEmptyState
        v-if="!scanning && !filteredJobs.length"
        icon="mdi:briefcase-search-outline"
        title="gramkit.jobs.empty"
        description="gramkit.jobs.emptyDesc"
        action-label="gramkit.jobs.scan"
        action-icon="mdi:refresh"
        :action-handler="scanJobs"
        size="lg"
      />

      <!-- Job cards -->
      <div v-else-if="!scanning" class="jobs-grid">
        <div
          v-for="(job, i) in filteredJobs"
          :key="job.id"
          class="job-card"
          :style="{ animationDelay: `${i * 30}ms` }"
        >
          <div class="jc-head">
            <span class="ch-badge">
              <Icon name="mdi:telegram" size="12" />
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
            <a v-if="job.link" :href="job.link" target="_blank" class="jc-open">
              <Icon name="mdi:open-in-new" size="13" />
              {{ $t("gramkit.jobs.open") }}
            </a>
            <button class="jc-copy" @click="copyText(job.text)">
              <Icon name="mdi:content-copy" size="13" />
              {{ $t("gramkit.jobs.copy") }}
            </button>
            <button class="jc-save" @click="saveJob(job)">
              <Icon
                :name="
                  savedIds.includes(job.id)
                    ? 'mdi:bookmark'
                    : 'mdi:bookmark-outline'
                "
                size="13"
              />
              {{
                savedIds.includes(job.id)
                  ? $t("gramkit.jobs.saved")
                  : $t("gramkit.jobs.save")
              }}
            </button>
          </div>
        </div>
      </div>

      <!-- Skeleton while scanning -->
      <div v-if="scanning" class="jobs-grid">
        <div v-for="n in 6" :key="n" class="skeleton-card">
          <div class="sk sk-s" />
          <div class="sk sk-l" />
          <div class="sk sk-m" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { useTelegram } from "~/composables/useTelegram";

const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, scanAllChannels } = useTelegram();

// ─── Range options ────────────────────────────────────────────────────────────
const searchDays = ref(0);
const rangeOptions = computed(() => [
  { value: 0, label: t("gramkit.range.today") },
  { value: 3, label: t("gramkit.range.3days") },
  { value: 7, label: t("gramkit.range.7days") },
  { value: 30, label: t("gramkit.range.30days") },
]);

// ─── Keywords ─────────────────────────────────────────────────────────────────
const keywords = ref(["مطلوب", "وظيفة", "تعيين", "vacancy", "hiring", "job"]);
const activeKeywords = ref([...keywords.value]);
const newKeyword = ref("");

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

// ─── Scanning state ───────────────────────────────────────────────────────────
const scanning = ref(false);
const scanProgress = ref(0);
const scanDone = ref(0);
const scanTotal = ref(0);
const jobs = ref([]);
const savedIds = ref(JSON.parse(localStorage.getItem("gk_saved_ids") ?? "[]"));

const filteredJobs = computed(() => {
  if (!activeKeywords.value.length) return jobs.value;
  return jobs.value.filter((j) =>
    j.matchedKeywords.some((k) => activeKeywords.value.includes(k)),
  );
});

const channelCount = computed(
  () => new Set(jobs.value.map((j) => j.channel)).size,
);

const statsCards = computed(() => [
  {
    key: "total",
    label: "gramkit.jobs.stats.total",
    value: filteredJobs.value.length,
    icon: "mdi:briefcase-outline",
    color: "blue",
  },
  {
    key: "channels",
    label: "gramkit.jobs.stats.channels",
    value: channelCount.value,
    icon: "mdi:telegram",
    color: "purple",
  },
  {
    key: "saved",
    label: "gramkit.jobs.stats.saved",
    value: savedIds.value.length,
    icon: "mdi:bookmark-multiple-outline",
    color: "green",
  },
]);

// ─── Scan ─────────────────────────────────────────────────────────────────────
const scanJobs = async () => {
  scanning.value = true;
  scanProgress.value = 0;
  scanDone.value = 0;
  jobs.value = [];

  const cutoff = new Date();
  if (searchDays.value === 0) cutoff.setHours(0, 0, 0, 0);
  else {
    cutoff.setDate(cutoff.getDate() - searchDays.value);
    cutoff.setHours(0, 0, 0, 0);
  }

  try {
    await scanAllChannels({
      limit: 100,
      cutoffDate: cutoff,
      onEachMessage: (msg, ch) => {
        const lower = msg.message.toLowerCase();
        const matched = keywords.value.filter((kw) =>
          lower.includes(kw.toLowerCase()),
        );
        if (matched.length) {
          jobs.value.push({
            id: `${ch.id}_${msg.id}`,
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
            matchedKeywords: matched,
          });
        }
      },
      onProgress: (done, total) => {
        scanDone.value = done;
        scanTotal.value = total;
        scanProgress.value = Math.round((done / total) * 100);
      },
    });
    if (!jobs.value.length) $toast.info(t("gramkit.toast.noJobs"));
    else $toast.success(`${jobs.value.length} ${t("gramkit.toast.jobsFound")}`);
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    scanning.value = false;
  }
};

// ─── Actions ──────────────────────────────────────────────────────────────────
const copyText = async (text) => {
  await navigator.clipboard.writeText(text);
  $toast.success(t("gramkit.toast.copied"));
};

const saveJob = (job) => {
  if (savedIds.value.includes(job.id)) {
    savedIds.value = savedIds.value.filter((id) => id !== job.id);
  } else {
    savedIds.value.push(job.id);
  }
  localStorage.setItem("gk_saved_ids", JSON.stringify(savedIds.value));
};

const truncate = (text, max) =>
  text?.length > max ? text.slice(0, max) + "…" : text;

// Auto-scan on mount
onMounted(() => {
  if (isConnected.value) scanJobs();
});

</script>

<style scoped lang="scss">
.tool-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 16px 80px;
  font-family: "Tajawal", sans-serif;
}

.guard {
  display: flex;
  justify-content: center;
  padding-top: 80px;
}

/* ── Tool header ─────────────────────────────────── */
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
  &.blue {
    background: rgba(42, 171, 238, 0.1);
    color: #2aabee;
    border: 1.5px solid rgba(42, 171, 238, 0.2);
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
  display: flex;
  align-items: center;
  gap: 10px;
  margin-inline-start: auto;
  flex-wrap: wrap;
}

/* ── Range switch ────────────────────────────────── */
.range-switch {
  display: flex;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}
.range-btn {
  padding: 7px 11px;
  font-size: 0.75rem;
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

/* ── Scan progress ───────────────────────────────── */
.scan-progress {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scan-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}

/* ── Keyword bar ─────────────────────────────────── */
.kw-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.kw-label {
  font-size: 0.78rem;
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
  padding: 3px 11px;
  border-radius: 20px;
  font-size: 0.76rem;
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

/* ── Keyword manager ─────────────────────────────── */
.kw-manager {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  font-weight: 500;
  color: var(--text-primary);
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
  align-items: flex-end;
}

/* ── Jobs grid ───────────────────────────────────── */
.jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

/* ── Job card ────────────────────────────────────── */
.job-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: card-in 0.3s ease both;
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
  font-size: 0.74rem;
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
  font-size: 0.72rem;
  color: var(--text-muted);
}
.jc-text {
  font-size: 0.86rem;
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
  font-size: 0.71rem;
  font-weight: 600;
}
.jc-foot {
  display: flex;
  gap: 6px;
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
  margin-top: auto;
  flex-wrap: wrap;
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
.jc-copy,
.jc-save {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-sub);
  cursor: pointer;
  font-family: "Tajawal", sans-serif;
  transition: background 0.18s;
  &:hover {
    background: var(--border-color);
  }
}

/* ── Skeleton ────────────────────────────────────── */
.skeleton-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
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
</style>
