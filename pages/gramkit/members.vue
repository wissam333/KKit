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
        <div class="tool-header-icon green">
          <Icon name="mdi:account-group-outline" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.tools.members.name") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.tools.members.desc") }}</p>
        </div>
      </div>

      <!-- Picker -->
      <div class="picker-row">
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
          @click="fetchMembers"
        >
          {{ $t("gramkit.members.fetch") }}
        </SharedUiButtonBase>
        <SharedUiButtonBase
          v-if="members.length"
          icon-left="mdi:download"
          @click="exportCSV"
        >
          {{ $t("gramkit.members.export") }}
        </SharedUiButtonBase>
      </div>

      <!-- Stats -->
      <SharedUiCardsStats
        v-if="members.length"
        :stats="statCards"
        :columns="3"
        :icon-size="22"
      />

      <!-- Search -->
      <div v-if="members.length" class="search-row">
        <SharedUiFormBaseInput
          v-model="search"
          :placeholder="$t('gramkit.members.search')"
          icon-left="mdi:magnify"
          clearable
        />
      </div>

      <!-- Table -->
      <div v-if="filteredMembers.length" class="members-table-wrap">
        <table class="members-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ $t("gramkit.members.col.name") }}</th>
              <th>{{ $t("gramkit.members.col.username") }}</th>
              <th>{{ $t("gramkit.members.col.phone") }}</th>
              <th>{{ $t("gramkit.members.col.type") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, i) in filteredMembers" :key="m.id">
              <td class="idx">{{ i + 1 }}</td>
              <td class="name">
                {{ [m.firstName, m.lastName].filter(Boolean).join(" ") || "—" }}
              </td>
              <td class="username">
                {{ m.username ? `@${m.username}` : "—" }}
              </td>
              <td class="phone">{{ m.phone || "—" }}</td>
              <td>
                <span class="type-badge" :class="m.isBot ? 'bot' : 'user'">{{
                  m.isBot ? "Bot" : "User"
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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

const selectedChannel = ref(null);
const loadingDialogs = ref(false);
const loading = ref(false);
const dialogs = ref([]);
const members = ref([]);
const search = ref("");

const channelOptions = computed(() =>
  dialogs.value.map((d) => ({
    label: d.title,
    value: d.id?.toString(),
    icon: d.isChannel ? "mdi:bullhorn-outline" : "mdi:account-group-outline",
  })),
);
const filteredMembers = computed(() => {
  if (!search.value) return members.value;
  const q = search.value.toLowerCase();
  return members.value.filter((m) =>
    [m.firstName, m.lastName, m.username, m.phone].some((v) =>
      v?.toLowerCase().includes(q),
    ),
  );
});
const statCards = computed(() => [
  {
    key: "total",
    label: "gramkit.members.stats.total",
    value: members.value.length,
    icon: "mdi:account-group-outline",
    color: "green",
  },
  {
    key: "users",
    label: "gramkit.members.stats.users",
    value: members.value.filter((m) => !m.isBot).length,
    icon: "mdi:account-outline",
    color: "blue",
  },
  {
    key: "bots",
    label: "gramkit.members.stats.bots",
    value: members.value.filter((m) => m.isBot).length,
    icon: "mdi:robot-outline",
    color: "purple",
  },
]);

onMounted(async () => {
  if (!isConnected.value) return;
  loadingDialogs.value = true;
  try {
    dialogs.value = await $fetch("/api/tg/dialogs", {
      method: "POST",
      body: { ...getCreds(), session: getSession() },
    });
  } finally {
    loadingDialogs.value = false;
  }
});

const fetchMembers = async () => {
  loading.value = true;
  members.value = [];
  try {
    members.value = await $fetch("/api/tg/members", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        channelId: selectedChannel.value,
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
  &.green {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1.5px solid rgba(34, 197, 94, 0.2);
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
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.channel-select {
  flex: 1;
  min-width: 200px;
}
.search-row {
  margin-bottom: 16px;
}

.members-table-wrap {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  overflow-x: auto;
}
.members-table {
  width: 100%;
  border-collapse: collapse;
  th {
    background: var(--bg-elevated);
    padding: 11px 14px;
    font-size: 0.76rem;
    font-weight: 700;
    color: var(--text-muted);
    text-align: start;
    border-bottom: 1px solid var(--border-color);
  }
  td {
    padding: 11px 14px;
    font-size: 0.83rem;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-color);
  }
  tr:last-child td {
    border-bottom: none;
  }
  tr:hover td {
    background: var(--bg-elevated);
  }
  .idx {
    color: var(--text-muted);
    width: 40px;
  }
  .name {
    font-weight: 600;
  }
  .username {
    color: #2aabee;
  }
  .phone {
    direction: ltr;
  }
}
.type-badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.71rem;
  font-weight: 700;
  &.user {
    background: rgba(42, 171, 238, 0.1);
    color: #2aabee;
  }
  &.bot {
    background: rgba(124, 58, 237, 0.1);
    color: #7c3aed;
  }
}
</style>
