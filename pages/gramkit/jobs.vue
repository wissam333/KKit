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
          ><Icon name="mdi:arrow-left" size="15"
        /></NuxtLink>
        <div class="tool-header-icon blue">
          <Icon name="mdi:briefcase-search-outline" size="20" />
        </div>
        <div class="tool-header-text">
          <h1 class="tool-title">{{ $t("gramkit.tools.jobs.name") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.tools.jobs.desc") }}</p>
        </div>
        <div class="tool-header-actions">
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
          <SharedUiButtonBase
            :loading="scanning"
            icon-left="mdi:refresh"
            variant="outline"
            size="sm"
            @click="scanJobs"
          >
            {{ $t("gramkit.jobs.scan") }}
          </SharedUiButtonBase>
        </div>
      </div>

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

      <SharedUiCardsStats
        v-if="!scanning && jobs.length"
        :stats="statsCards"
        :columns="3"
        :icon-size="22"
      />

      <!-- Keyword filter -->
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
            >{{ $t("gramkit.jobs.addKeyword") }}</SharedUiButtonBase
          >
        </div>
      </div>

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
            <span class="ch-badge"
              ><Icon name="mdi:telegram" size="11" />{{ job.channel }}</span
            >
            <span class="jc-time"
              ><Icon name="mdi:clock-outline" size="11" />{{ job.time }}</span
            >
          </div>
          <p class="jc-text">{{ truncate(job.text, 280) }}</p>
          <div class="jc-kws">
            <span v-for="kw in job.matchedKeywords" :key="kw" class="mk">{{
              kw
            }}</span>
          </div>
          <div class="jc-foot">
            <a v-if="job.link" :href="job.link" target="_blank" class="jc-open"
              ><Icon name="mdi:open-in-new" size="12" />{{
                $t("gramkit.jobs.open")
              }}</a
            >
            <button class="jc-action-btn" @click="copyText(job.text)">
              <Icon name="mdi:content-copy" size="12" />{{
                $t("gramkit.jobs.copy")
              }}
            </button>
            <button
              class="jc-action-btn"
              :class="{ saved: savedIds.includes(job.id) }"
              @click="saveJob(job)"
            >
              <Icon
                :name="
                  savedIds.includes(job.id)
                    ? 'mdi:bookmark'
                    : 'mdi:bookmark-outline'
                "
                size="12"
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

      <!-- Skeleton -->
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
const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, getSession, getCreds } = useTelegram();

const searchDays = ref(0);
const rangeOptions = computed(() => [
  { value: 0, label: t("gramkit.range.today") },
  { value: 3, label: t("gramkit.range.3days") },
  { value: 7, label: t("gramkit.range.7days") },
  { value: 30, label: t("gramkit.range.30days") },
]);

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

const scanning = ref(false);
const scanProgress = ref(0);
const scanDone = ref(0);
const scanTotal = ref(0);
const jobs = ref([]);
const savedIds = ref(JSON.parse(localStorage.getItem("gk_saved_ids") ?? "[]"));

const filteredJobs = computed(() =>
  !activeKeywords.value.length
    ? jobs.value
    : jobs.value.filter((j) =>
        j.matchedKeywords.some((k) => activeKeywords.value.includes(k)),
      ),
);
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

const scanJobs = async () => {
  scanning.value = true;
  scanProgress.value = 0;
  scanDone.value = 0;
  jobs.value = [];
  try {
    const result = await $fetch("/api/tg/jobs/scan", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        searchDays: searchDays.value,
        keywords: keywords.value,
        locale: locale.value,
      },
    });
    jobs.value = result.jobs;
    scanProgress.value = 100;
    scanDone.value = result.scanned;
    scanTotal.value = result.scanned;
    if (!jobs.value.length) $toast.info(t("gramkit.toast.noJobs"));
    else $toast.success(`${jobs.value.length} ${t("gramkit.toast.jobsFound")}`);
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    scanning.value = false;
  }
};

const copyText = async (text) => {
  await navigator.clipboard.writeText(text);
  $toast.success(t("gramkit.toast.copied"));
};
const saveJob = (job) => {
  savedIds.value.includes(job.id)
    ? (savedIds.value = savedIds.value.filter((id) => id !== job.id))
    : savedIds.value.push(job.id);
  localStorage.setItem("gk_saved_ids", JSON.stringify(savedIds.value));
};
const truncate = (text, max) =>
  text?.length > max ? text.slice(0, max) + "…" : text;

onMounted(() => {
  if (isConnected.value) scanJobs();
});
</script>

<style scoped lang="scss">
/* ─── Shared base ──────── import from partial in real project ── */
.tool-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 80px;
  font-family: "Tajawal", sans-serif;
  @media (max-width: 768px) {
    padding: 20px 14px 60px;
  }
  @media (max-width: 480px) {
    padding: 16px 12px 50px;
  }
}
.guard {
  display: flex;
  justify-content: center;
  padding-top: 60px;
}
.tool-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
  flex-wrap: wrap;
}
.back-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-decoration: none;
  &:hover {
    color: var(--text-primary);
  }
}
.tool-header-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &.blue {
    background: rgba(42, 171, 238, 0.1);
    color: #2aabee;
    border: 1.5px solid rgba(42, 171, 238, 0.2);
  }
  @media (max-width: 480px) {
    width: 36px;
    height: 36px;
  }
}
.tool-header-text {
  min-width: 0;
}
.tool-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-primary);
  margin: 0 0 2px;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tool-sub {
  font-size: 0.76rem;
  color: var(--text-sub);
  margin: 0;
}
.tool-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-inline-start: auto;
  flex-wrap: wrap;
}
.scan-progress {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.scan-label {
  font-size: 0.76rem;
  color: var(--text-muted);
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
  font-size: 0.77rem;
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
  flex-wrap: wrap;
}

/* ─── Range switch ───────────────────────────────────────────── */
.range-switch {
  display: flex;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}

.seg-btn {
  padding: 7px 10px;
  font-size: 0.74rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.18s;
  white-space: nowrap;
  &.active {
    background: #2aabee;
    color: #fff;
  }

  @media (max-width: 360px) {
    padding: 6px 7px;
    font-size: 0.7rem;
  }
}

/* ─── Keyword filter bar ─────────────────────────────────────── */
.kw-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.kw-label {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}

.kw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.kw-chip {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.74rem;
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

/* ─── Keyword manager ────────────────────────────────────────── */
.kw-manager {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 13px;
  padding: 13px;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

/* ─── Jobs grid ──────────────────────────────────────────────── */
.jobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    gap: 9px;
  }
}

/* ─── Job card ───────────────────────────────────────────────── */
.job-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  animation: card-in 0.3s ease both;
  transition:
    box-shadow 0.2s,
    transform 0.2s;
  &:hover {
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.07);
    transform: translateY(-2px);
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

.jc-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.ch-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(42, 171, 238, 0.1);
  color: #1a85c8;
  border-radius: 20px;
  padding: 2px 9px;
  font-size: 0.72rem;
  font-weight: 600;
  max-width: 55%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.jc-time {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.7rem;
  color: var(--text-muted);
}

.jc-text {
  font-size: 0.84rem;
  color: var(--text-primary);
  line-height: 1.65;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.jc-kws {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.mk {
  padding: 2px 7px;
  background: rgba(211, 47, 47, 0.08);
  color: #d32f2f;
  border-radius: 5px;
  font-size: 0.69rem;
  font-weight: 600;
}

.jc-foot {
  display: flex;
  gap: 5px;
  border-top: 1px solid var(--border-color);
  padding-top: 9px;
  margin-top: auto;
  flex-wrap: wrap;
}

.jc-open {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 11px;
  background: linear-gradient(135deg, #2aabee, #1a85c8);
  color: #fff !important;
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 600;
  text-decoration: none;
  &:hover {
    opacity: 0.87;
  }
}

.jc-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 11px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 7px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-sub);
  cursor: pointer;
  font-family: "Tajawal", sans-serif;
  transition: background 0.18s;
  &:hover {
    background: var(--border-color);
  }
  &.saved {
    color: #2aabee;
  }
}

/* ─── Skeleton ───────────────────────────────────────────────── */
.skeleton-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.sk {
  height: 10px;
  border-radius: 5px;
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
  width: 36%;
}
.sk-m {
  width: 62%;
}
.sk-l {
  width: 100%;
  height: 34px;
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
