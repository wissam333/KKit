<template>
  <div class="tool-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <!-- Guard -->
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
          <Icon name="mdi:arrow-left" size="15" />
        </NuxtLink>
        <div class="tool-header-icon">
          <Icon name="mdi:account-group-outline" size="20" />
        </div>
        <div class="tool-header-text">
          <h1 class="tool-title">{{ $t("gramkit.tools.members.name") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.tools.members.desc") }}</p>
        </div>
      </div>

      <!-- Controls card -->
      <div class="controls-card">
        <!-- Row 1: channel + fetch + export -->
        <div class="controls-row">
          <SharedUiFormBaseSelect
            v-model="selectedChannel"
            :options="channelOptions"
            :placeholder="$t('gramkit.members.pick')"
            :loading="loadingDialogs"
            icon-left="mdi:account-group-outline"
            searchable
            class="channel-select"
          />
          <SharedUiButtonBase
            :loading="loading"
            :disabled="!selectedChannel"
            icon-left="mdi:account-search-outline"
            variant="outline"
            class="fetch-btn"
            @click="fetchMembers"
          >
            {{ $t("gramkit.members.fetch") }}
          </SharedUiButtonBase>
          <SharedUiButtonBase
            v-if="members.length"
            icon-left="mdi:download"
            class="export-btn"
            @click="exportCSV"
          >
            {{ $t("gramkit.members.export") }}
          </SharedUiButtonBase>
        </div>

        <!-- Row 2: options -->
        <div class="options-row">
          <!-- Limit stepper -->
          <div class="option-block">
            <span class="option-label">{{ $t("gramkit.members.limit") }}</span>
            <div class="limit-stepper">
              <button
                class="step-btn"
                :disabled="memberLimit <= 10"
                @click="stepLimit(-1)"
              >
                <Icon name="mdi:minus" size="12" />
              </button>
              <input
                v-model.number="memberLimit"
                type="number"
                class="limit-val"
                min="10"
                max="10000"
                @blur="clampLimit"
              />
              <button
                class="step-btn"
                :disabled="memberLimit >= 10000"
                @click="stepLimit(1)"
              >
                <Icon name="mdi:plus" size="12" />
              </button>
            </div>
          </div>

          <div class="option-divider" />

          <!-- <div class="option-block">
            <span class="option-label">{{ $t("gramkit.members.method.name") }}</span>
            <select v-model="fetchMethod" class="method-select">
              <option value="auto">
                {{ $t("gramkit.members.method.auto") }}
              </option>
              <option value="participants">
                {{ $t("gramkit.members.method.participants") }}
              </option>
              <option value="messages">
                {{ $t("gramkit.members.method.messages") }}
              </option>
            </select>
          </div> -->

          <!-- Include groups toggle -->
          <div class="option-block toggle-block">
            <label class="toggle-wrap">
              <input
                v-model="includeGroups"
                type="checkbox"
                class="sr-only"
                @change="reloadDialogs"
              />
              <span class="toggle-track">
                <span class="toggle-thumb" />
              </span>
            </label>
            <span class="option-label">{{
              $t("gramkit.members.includeGroups")
            }}</span>
          </div>

          <!-- Bot filter -->
          <div class="option-block toggle-block">
            <label class="toggle-wrap">
              <input v-model="hideBots" type="checkbox" class="sr-only" />
              <span class="toggle-track">
                <span class="toggle-thumb" />
              </span>
            </label>
            <span class="option-label">{{
              $t("gramkit.members.hideBots")
            }}</span>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div v-if="members.length" class="stats-row">
        <div class="stat-card">
          <Icon
            name="mdi:account-group-outline"
            size="16"
            class="stat-icon green"
          />
          <div>
            <div class="stat-val">{{ members.length.toLocaleString() }}</div>
            <div class="stat-label">
              {{ $t("gramkit.members.stats.total") }}
            </div>
          </div>
        </div>
        <div class="stat-card">
          <Icon name="mdi:account-outline" size="16" class="stat-icon blue" />
          <div>
            <div class="stat-val">{{ userCount.toLocaleString() }}</div>
            <div class="stat-label">
              {{ $t("gramkit.members.stats.users") }}
            </div>
          </div>
        </div>
        <div class="stat-card">
          <Icon name="mdi:robot-outline" size="16" class="stat-icon purple" />
          <div>
            <div class="stat-val">{{ botCount.toLocaleString() }}</div>
            <div class="stat-label">{{ $t("gramkit.members.stats.bots") }}</div>
          </div>
        </div>
        <div v-if="search || hideBots" class="stat-card accent">
          <Icon name="mdi:filter-outline" size="16" class="stat-icon amber" />
          <div>
            <div class="stat-val">
              {{ filteredMembers.length.toLocaleString() }}
            </div>
            <div class="stat-label">
              {{ $t("gramkit.members.stats.showing") }}
            </div>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div v-if="members.length" class="search-wrap">
        <Icon name="mdi:magnify" size="15" class="search-icon" />
        <input
          v-model="search"
          class="search-input"
          :placeholder="$t('gramkit.members.search')"
        />
        <button v-if="search" class="search-clear" @click="search = ''">
          <Icon name="mdi:close" size="13" />
        </button>
      </div>

      <!-- Table -->
      <div v-if="filteredMembers.length" class="table-wrap">
        <table class="members-table">
          <thead>
            <tr>
              <th class="col-idx">#</th>
              <th class="col-sortable" @click="sortBy('name')">
                {{ $t("gramkit.members.col.name") }}
                <Icon :name="sortIcon('name')" size="12" class="sort-icon" />
              </th>
              <th class="col-sortable" @click="sortBy('username')">
                {{ $t("gramkit.members.col.username") }}
                <Icon
                  :name="sortIcon('username')"
                  size="12"
                  class="sort-icon"
                />
              </th>
              <th>{{ $t("gramkit.members.col.phone") }}</th>
              <th>{{ $t("gramkit.members.col.type") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(m, i) in paginatedMembers"
              :key="m.id"
              class="member-row"
            >
              <td class="col-idx muted">
                {{ (currentPage - 1) * pageSize + i + 1 }}
              </td>
              <td class="col-name">
                {{ [m.firstName, m.lastName].filter(Boolean).join(" ") || "—" }}
              </td>
              <td class="col-username">
                <a
                  v-if="m.username"
                  :href="`https://t.me/${m.username}`"
                  target="_blank"
                  rel="noopener"
                  >@{{ m.username }}</a
                >
                <span v-else class="muted">—</span>
              </td>
              <td class="col-phone">{{ m.phone || "—" }}</td>
              <td>
                <span
                  class="badge"
                  :class="m.isBot ? 'badge-bot' : 'badge-user'"
                >
                  {{
                    m.isBot
                      ? $t("gramkit.members.bot")
                      : $t("gramkit.members.user")
                  }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="page-btn"
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          <Icon name="mdi:chevron-left" size="15" />
        </button>
        <span class="page-info"> {{ currentPage }} / {{ totalPages }} </span>
        <button
          class="page-btn"
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          <Icon name="mdi:chevron-right" size="15" />
        </button>
        <span class="page-size-label">{{ $t("gramkit.members.perPage") }}</span>
        <select
          v-model.number="pageSize"
          class="page-size-select"
          @change="currentPage = 1"
        >
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
      </div>

      <!-- Empty state -->
      <SharedUiFeedbackEmptyState
        v-if="!members.length && !loading"
        icon="mdi:account-group-outline"
        title="gramkit.members.empty"
        description="gramkit.members.emptyDesc"
        size="lg"
      />
    </template>
  </div>
</template>

<script setup>
const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, getSession, getCreds } = useTelegram();

// ── State ──────────────────────────────────────────────
const selectedChannel = ref(null);
const loadingDialogs = ref(false);
const loading = ref(false);
const dialogs = ref([]);
const members = ref([]);
const search = ref("");
const memberLimit = ref(500);
const includeGroups = ref(false);
const hideBots = ref(false);
const sortKey = ref("name");
const sortDir = ref(1); // 1 = asc, -1 = desc
const currentPage = ref(1);
const pageSize = ref(50);
const fetchMethod = ref("auto");

// ── Limit steps ────────────────────────────────────────
const LIMIT_STEPS = [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

const stepLimit = (dir) => {
  const v = memberLimit.value;
  if (dir > 0) memberLimit.value = LIMIT_STEPS.find((s) => s > v) ?? 10000;
  else memberLimit.value = [...LIMIT_STEPS].reverse().find((s) => s < v) ?? 10;
};

const clampLimit = () => {
  memberLimit.value = Math.min(Math.max(memberLimit.value || 10, 10), 10000);
};

// ── Sort ───────────────────────────────────────────────
const sortBy = (key) => {
  if (sortKey.value === key) sortDir.value *= -1;
  else {
    sortKey.value = key;
    sortDir.value = 1;
  }
  currentPage.value = 1;
};

const sortIcon = (key) => {
  if (sortKey.value !== key) return "mdi:unfold-more-horizontal";
  return sortDir.value === 1 ? "mdi:arrow-up" : "mdi:arrow-down";
};

// ── Computed ───────────────────────────────────────────
const channelOptions = computed(() =>
  dialogs.value.map((d) => ({
    label: d.title,
    value: d.id?.toString(),
    icon: d.isChannel ? "mdi:bullhorn-outline" : "mdi:account-group-outline",
  })),
);

const userCount = computed(() => members.value.filter((m) => !m.isBot).length);
const botCount = computed(() => members.value.filter((m) => m.isBot).length);

const filteredMembers = computed(() => {
  let list = members.value;
  if (hideBots.value) list = list.filter((m) => !m.isBot);
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter((m) =>
      [m.firstName, m.lastName, m.username, m.phone].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }
  // sort
  return [...list].sort((a, b) => {
    let av, bv;
    if (sortKey.value === "name") {
      av = [a.firstName, a.lastName].filter(Boolean).join(" ").toLowerCase();
      bv = [b.firstName, b.lastName].filter(Boolean).join(" ").toLowerCase();
    } else {
      av = (a.username ?? "").toLowerCase();
      bv = (b.username ?? "").toLowerCase();
    }
    if (av < bv) return -1 * sortDir.value;
    if (av > bv) return 1 * sortDir.value;
    return 0;
  });
});

const totalPages = computed(() =>
  Math.ceil(filteredMembers.value.length / pageSize.value),
);

const paginatedMembers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredMembers.value.slice(start, start + pageSize.value);
});

// reset page on filter change
watch([search, hideBots, pageSize], () => {
  currentPage.value = 1;
});

// ── API calls ──────────────────────────────────────────
const loadDialogs = async () => {
  if (!isConnected.value) return;
  loadingDialogs.value = true;
  try {
    dialogs.value = await $fetch("/api/tg/members/dialogs", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        includeGroups: includeGroups.value,
      },
    });
  } finally {
    loadingDialogs.value = false;
  }
};

const reloadDialogs = () => {
  selectedChannel.value = null;
  members.value = [];
  loadDialogs();
};

onMounted(loadDialogs);

const fetchMembers = async () => {
  loading.value = true;
  members.value = [];
  currentPage.value = 1;
  try {
    members.value = await $fetch("/api/tg/members/members", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        channelId: selectedChannel.value,
        limit: memberLimit.value,
        method: fetchMethod.value,
      },
    });
    if (!members.value.length) $toast.info(t("gramkit.members.noMembers"));
    else
      $toast.success(`${members.value.length} ${t("gramkit.members.fetched")}`);
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    loading.value = false;
  }
};

// ── Export ─────────────────────────────────────────────
const exportCSV = () => {
  const header = "ID,First Name,Last Name,Username,Phone,Is Bot";
  const rows = members.value.map((m) =>
    [m.id, m.firstName, m.lastName, m.username, m.phone, m.isBot]
      .map((v) => '"' + (v ?? "") + '"')
      .join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "members.csv";
  a.click();
  URL.revokeObjectURL(url);
  $toast.success(t("gramkit.members.exported"));
};
</script>

<style scoped lang="scss">
/* ── Layout ─────────────────────────────────────────── */
.tool-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px 16px 80px;
  font-family: "Tajawal", sans-serif;
}
.guard {
  display: flex;
  justify-content: center;
  padding-top: 80px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ── Header ─────────────────────────────────────────── */
.tool-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.back-btn {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  text-decoration: none;
  flex-shrink: 0;
  transition: color 0.15s;
  &:hover {
    color: var(--text-primary);
  }
}
.tool-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: rgba(34, 197, 94, 0.1);
  border: 1.5px solid rgba(34, 197, 94, 0.22);
  color: #22c55e;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tool-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 2px;
}
.tool-sub {
  font-size: 0.78rem;
  color: var(--text-sub);
  margin: 0;
}

/* ── Controls card ──────────────────────────────────── */
.controls-card {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.controls-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.channel-select {
  flex: 1;
  min-width: 180px;
}

.options-row {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 12px;
  gap: 0;
}
.option-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 14px;
  flex-shrink: 0;
}
.option-block {
  display: flex;
  align-items: center;
  gap: 8px;
}
.toggle-block {
  gap: 8px;
}
.option-label {
  font-size: 0.78rem;
  color: var(--text-sub);
  white-space: nowrap;
}

/* Limit stepper */
.limit-stepper {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 7px;
  padding: 2px 6px;
  height: 28px;
}
.step-btn {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-elevated);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: background 0.12s;
  flex-shrink: 0;
  &:hover:not(:disabled) {
    background: var(--bg-hover, var(--bg-surface));
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}
.limit-val {
  width: 52px;
  text-align: center;
  border: none;
  background: transparent;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: monospace;
  outline: none;
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
}

/* Toggle */
.toggle-wrap {
  position: relative;
  width: 32px;
  height: 18px;
  cursor: pointer;
  flex-shrink: 0;
}
.toggle-track {
  position: absolute;
  inset: 0;
  background: var(--border-color);
  border-radius: 9px;
  transition: background 0.15s;
  input:checked ~ & {
    background: #22c55e;
  }
}
.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.15s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  input:checked ~ .toggle-track + & {
    transform: translateX(14px);
  }
}
/* fix: thumb is a sibling of track inside label */
.toggle-wrap input:checked ~ .toggle-track {
  background: #22c55e;
}
.toggle-wrap input:checked + .toggle-track {
  background: #22c55e;
}

/* ── Stats ──────────────────────────────────────────── */
.stats-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 11px;
  padding: 10px 14px;
  flex: 1;
  min-width: 110px;
  &.accent {
    border-color: rgba(251, 191, 36, 0.3);
    background: rgba(251, 191, 36, 0.05);
  }
}
.stat-icon {
  &.green {
    color: #22c55e;
  }
  &.blue {
    color: #3b82f6;
  }
  &.purple {
    color: #a855f7;
  }
  &.amber {
    color: #f59e0b;
  }
}
.stat-val {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.stat-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Search ─────────────────────────────────────────── */
.search-wrap {
  position: relative;
  margin-bottom: 12px;
}
.search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  height: 38px;
  padding: 0 34px;
  border-radius: 10px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.85rem;
  font-family: "Tajawal", sans-serif;
  outline: none;
  transition: border-color 0.15s;
  &:focus {
    border-color: rgba(34, 197, 94, 0.5);
  }
  &::placeholder {
    color: var(--text-muted);
  }
}
.search-clear {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 2px;
  border-radius: 4px;
  &:hover {
    color: var(--text-primary);
  }
}

/* ── Table ──────────────────────────────────────────── */
.table-wrap {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  overflow-x: auto;
  margin-bottom: 12px;
}
.members-table {
  width: 100%;
  border-collapse: collapse;

  thead tr {
    background: var(--bg-elevated);
  }
  th {
    padding: 10px 14px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-muted);
    text-align: start;
    border-bottom: 1.5px solid var(--border-color);
    white-space: nowrap;
    user-select: none;
    &.col-sortable {
      cursor: pointer;
      &:hover {
        color: var(--text-primary);
      }
    }
  }
  td {
    padding: 10px 14px;
    font-size: 0.83rem;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
    vertical-align: middle;
  }
  tr:last-child td {
    border-bottom: none;
  }
  tr.member-row:hover td {
    background: var(--bg-elevated);
  }
}
.sort-icon {
  margin-inline-start: 3px;
  opacity: 0.6;
  vertical-align: middle;
}
.col-idx {
  width: 44px;
}
.col-name {
  font-weight: 600;
}
.col-username a {
  color: #2aabee;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}
.col-phone {
  direction: ltr;
  font-variant-numeric: tabular-nums;
}
.muted {
  color: var(--text-muted);
}

.badge {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  &.badge-user {
    background: rgba(42, 171, 238, 0.1);
    color: #2aabee;
  }
  &.badge-bot {
    background: rgba(168, 85, 247, 0.1);
    color: #a855f7;
  }
}

/* ── Pagination ─────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.page-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.12s;
  &:hover:not(:disabled) {
    background: var(--bg-elevated);
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}
.page-info {
  font-size: 0.8rem;
  color: var(--text-sub);
  font-variant-numeric: tabular-nums;
  min-width: 48px;
  text-align: center;
}
.page-size-label {
  font-size: 0.78rem;
  color: var(--text-muted);
}
.page-size-select {
  height: 30px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1.5px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-family: "Tajawal", sans-serif;
  cursor: pointer;
  outline: none;
}

.method-select {
  height: 28px;
  padding: 0 8px;
  border-radius: 7px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 0.78rem;
  font-family: "Tajawal", sans-serif;
  outline: none;
  cursor: pointer;
}
</style>
