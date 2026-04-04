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
        <div class="tool-header-icon teal">
          <Icon name="mdi:image-multiple-outline" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.tools.media.name") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.tools.media.desc") }}</p>
        </div>
      </div>

      <!-- Picker -->
      <div class="picker-row">
        <SharedUiFormBaseSelect
          v-model="selectedChannel"
          :options="channelOptions"
          :placeholder="$t('gramkit.media.pick')"
          :loading="loadingDialogs"
          icon-left="mdi:telegram"
          searchable
          class="channel-select"
        />
        <div class="seg-control">
          <button
            v-for="f in filterOptions"
            :key="f.value"
            class="seg-btn"
            :class="{ active: typeFilter === f.value }"
            @click="typeFilter = f.value"
          >
            {{ f.label }}
          </button>
        </div>
        <SharedUiButtonBase
          :loading="loading"
          :disabled="!selectedChannel"
          icon-left="mdi:magnify"
          variant="outline"
          @click="fetchMedia"
        >
          {{ $t("gramkit.media.fetch") }}
        </SharedUiButtonBase>
      </div>

      <!-- Stats -->
      <SharedUiCardsStats
        v-if="mediaList.length"
        :stats="statCards"
        :columns="3"
        :icon-size="22"
      />

      <!-- Grid -->
      <div v-if="filteredMedia.length" class="media-grid">
        <div v-for="item in filteredMedia" :key="item.id" class="media-card">
          <div class="media-icon-wrap" :class="item.type">
            <Icon
              :name="
                item.type === 'photo' ? 'mdi:image-outline' : 'mdi:file-outline'
              "
              size="28"
            />
          </div>
          <div class="media-info">
            <div class="media-name">{{ item.fileName }}</div>
            <div class="media-meta">
              <span class="media-type-badge" :class="item.type">{{
                item.type
              }}</span>
              <span v-if="item.size" class="media-size">{{
                formatSize(item.size)
              }}</span>
              <span class="media-date">{{
                item.date.toLocaleDateString(
                  locale === "ar" ? "ar-EG" : "en-GB",
                )
              }}</span>
            </div>
          </div>
          <button
            class="dl-btn"
            :class="{ loading: downloading[item.id] }"
            :disabled="downloading[item.id]"
            @click="downloadItem(item)"
          >
            <Icon
              :name="downloading[item.id] ? 'mdi:loading' : 'mdi:download'"
              size="16"
              :class="{ spin: downloading[item.id] }"
            />
          </button>
        </div>
      </div>

      <SharedUiFeedbackEmptyState
        v-if="!mediaList.length && !loading"
        icon="mdi:image-multiple-outline"
        title="gramkit.media.empty"
        description="gramkit.media.emptyDesc"
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
const mediaList = ref([]);
const typeFilter = ref("all");
const downloading = ref({});

const filterOptions = [
  { value: "all", label: t("gramkit.media.all") },
  { value: "photo", label: t("gramkit.media.photos") },
  { value: "document", label: t("gramkit.media.docs") },
];

const channelOptions = computed(() =>
  dialogs.value.map((d) => ({
    label: d.title,
    value: d.id?.toString(),
    icon: "mdi:telegram",
  })),
);
const filteredMedia = computed(() =>
  typeFilter.value === "all"
    ? mediaList.value
    : mediaList.value.filter((m) => m.type === typeFilter.value),
);
const statCards = computed(() => [
  {
    key: "total",
    label: "gramkit.media.stats.total",
    value: mediaList.value.length,
    icon: "mdi:file-multiple-outline",
    color: "teal",
  },
  {
    key: "photos",
    label: "gramkit.media.stats.photos",
    value: mediaList.value.filter((m) => m.type === "photo").length,
    icon: "mdi:image-outline",
    color: "blue",
  },
  {
    key: "docs",
    label: "gramkit.media.stats.docs",
    value: mediaList.value.filter((m) => m.type === "document").length,
    icon: "mdi:file-outline",
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

const fetchMedia = async () => {
  loading.value = true;
  mediaList.value = [];
  try {
    const result = await $fetch("/api/tg/media/list", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        channelId: selectedChannel.value,
      },
    });
    mediaList.value = result.items.map((m) => ({
      ...m,
      date: new Date(m.date),
    }));
    if (!mediaList.value.length) $toast.info(t("gramkit.media.noMedia"));
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    loading.value = false;
  }
};

const downloadItem = async (item) => {
  downloading.value[item.id] = true;
  try {
    const result = await $fetch("/api/tg/media/download", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        channelId: selectedChannel.value,
        msgId: item.id,
      },
    });
    // result.data is base64
    const binary = atob(result.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.fileName;
    a.click();
    URL.revokeObjectURL(url);
    $toast.success(t("gramkit.media.downloaded"));
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    downloading.value[item.id] = false;
  }
};

const formatSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  &.teal {
    background: rgba(20, 184, 166, 0.1);
    color: #14b8a6;
    border: 1.5px solid rgba(20, 184, 166, 0.2);
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

.seg-control {
  display: flex;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}
.seg-btn {
  padding: 8px 12px;
  font-size: 0.77rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.18s;
  &.active {
    background: #14b8a6;
    color: #fff;
  }
}

.media-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.media-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  transition: box-shadow 0.2s;
  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  }
}
.media-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &.photo {
    background: rgba(42, 171, 238, 0.1);
    color: #2aabee;
  }
  &.document {
    background: rgba(124, 58, 237, 0.1);
    color: #7c3aed;
  }
  &.other {
    background: var(--bg-elevated);
    color: var(--text-muted);
  }
}
.media-info {
  flex: 1;
  min-width: 0;
}
.media-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.media-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.media-type-badge {
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  &.photo {
    background: rgba(42, 171, 238, 0.1);
    color: #2aabee;
  }
  &.document {
    background: rgba(124, 58, 237, 0.1);
    color: #7c3aed;
  }
}
.media-size,
.media-date {
  font-size: 0.72rem;
  color: var(--text-muted);
}
.dl-btn {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  flex-shrink: 0;
  background: rgba(20, 184, 166, 0.1);
  border: 1.5px solid rgba(20, 184, 166, 0.25);
  color: #14b8a6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
  &:hover:not(:disabled) {
    background: #14b8a6;
    color: #fff;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .spin {
    animation: spin 0.7s linear infinite;
  }
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
