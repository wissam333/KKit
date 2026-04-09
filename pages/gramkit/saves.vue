<template>
  <div class="tool-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div v-if="!isConnected" class="guard">
      <SharedUiFeedbackEmptyState
        icon="mdi:bookmark-multiple-outline"
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
        <div class="tool-header-icon saves">
          <Icon name="mdi:bookmark-multiple-outline" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.saves.title") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.saves.subtitle") }}</p>
        </div>
        <div class="header-actions">
          <template v-if="!messages.length">
            <div class="limit-field">
              <label class="limit-label">{{ $t("gramkit.saves.limit") }}</label>
              <div class="limit-input-wrap">
                <button
                  class="limit-step"
                  :disabled="fetchLimit <= 50"
                  @click="fetchLimit = Math.max(50, fetchLimit - 50)"
                >
                  <Icon name="mdi:minus" size="13" />
                </button>
                <input
                  v-model.number="fetchLimit"
                  type="number"
                  class="limit-input"
                  min="50"
                  max="500"
                  step="50"
                  @blur="
                    fetchLimit = Math.min(500, Math.max(50, fetchLimit || 200))
                  "
                />
                <button
                  class="limit-step"
                  :disabled="fetchLimit >= 500"
                  @click="fetchLimit = Math.min(500, fetchLimit + 50)"
                >
                  <Icon name="mdi:plus" size="13" />
                </button>
              </div>
            </div>
            <SharedUiButtonBase
              :loading="loading"
              icon-left="mdi:download-outline"
              @click="loadSaved()"
            >
              {{ $t("gramkit.saves.load") }}
            </SharedUiButtonBase>
          </template>
          <template v-else>
            <SharedUiButtonBase
              icon-left="mdi:refresh"
              variant="outline"
              size="sm"
              @click="loadSaved()"
            >
              {{ $t("gramkit.saves.reload") }}
            </SharedUiButtonBase>
            <SharedUiButtonBase
              v-if="selected.length"
              icon-left="mdi:delete-sweep-outline"
              variant="error"
              size="sm"
              :loading="bulkDeleting"
              @click="confirmBulkDelete"
            >
              {{ $t("gramkit.saves.deleteSelected", { n: selected.length }) }}
            </SharedUiButtonBase>
            <SharedUiButtonBase
              icon-left="mdi:export-variant"
              variant="outline"
              size="sm"
              @click="exportAll"
            >
              {{ $t("gramkit.saves.export") }}
            </SharedUiButtonBase>
          </template>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-wrap">
        <SharedUiIndicatorsProgress
          type="linear"
          :value="loadPct"
          color="primary"
          :show-value="true"
        />
        <span class="load-msg">{{ $t("gramkit.saves.loading") }}</span>
      </div>

      <!-- Controls -->
      <div v-if="messages.length && !loading" class="controls-row">
        <SharedUiFormBaseInput
          v-model="search"
          :placeholder="$t('gramkit.saves.search')"
          icon-left="mdi:magnify"
          clearable
          class="search-input"
        />
        <div class="seg-control">
          <button
            v-for="f in typeFilters"
            :key="f.v"
            class="seg-btn"
            :class="{ active: typeFilter === f.v }"
            @click="typeFilter = f.v"
          >
            <Icon :name="f.icon" size="14" />
            {{ f.label }}
          </button>
        </div>
        <div v-if="allTags.length" class="tag-pills">
          <button
            v-for="tag in allTags"
            :key="tag"
            class="tag-pill"
            :class="{ active: selectedTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            #{{ tag }}
          </button>
        </div>
      </div>

      <!-- Bulk select bar -->
      <div v-if="messages.length && !loading" class="bulk-bar">
        <label class="bulk-check-label">
          <input
            type="checkbox"
            :checked="allFilteredSelected"
            @change="toggleSelectAll"
          />
          <span
            >{{ $t("gramkit.saves.selectAll") }} ({{ filtered.length }})</span
          >
        </label>
        <span v-if="selected.length" class="bulk-count">
          {{ selected.length }} {{ $t("gramkit.saves.selected") }}
        </span>
      </div>

      <!-- Stats -->
      <SharedUiCardsStats
        v-if="messages.length && !loading"
        :stats="statCards"
        :columns="4"
        :icon-size="20"
      />

      <!-- Message list -->
      <div v-if="filtered.length && !loading" class="msg-list">
        <div
          v-for="msg in filtered"
          :key="msg.id"
          class="msg-card"
          :class="{
            'msg-card--tagged': getLocalData(msg.id).tags.length,
            'msg-card--selected': selected.includes(msg.id),
          }"
        >
          <!-- Selection checkbox -->
          <div class="msg-select" @click.stop="toggleSelect(msg.id)">
            <input
              type="checkbox"
              :checked="selected.includes(msg.id)"
              @change="toggleSelect(msg.id)"
            />
          </div>

          <!-- Head -->
          <div class="msg-head">
            <span class="msg-type-icon">
              <Icon :name="msgIcon(msg)" size="15" />
            </span>
            <span class="msg-date">{{ formatDate(msg.date) }}</span>
            <span v-if="msg.isForwarded" class="fwd-badge">
              <Icon name="mdi:share-outline" size="12" />
              {{ msg.forwardedFrom?.fromName ?? $t("gramkit.saves.forwarded") }}
            </span>
            <div class="msg-actions">
              <button
                class="action-btn"
                :title="$t('gramkit.saves.addTag')"
                @click="openTagModal(msg)"
              >
                <Icon name="mdi:tag-plus-outline" size="14" />
              </button>
              <button
                class="action-btn"
                :title="$t('gramkit.saves.copy')"
                @click="copy(msg.text)"
              >
                <Icon name="mdi:content-copy" size="14" />
              </button>
              <button
                class="action-btn danger"
                :title="$t('gramkit.saves.delete')"
                @click="deleteMsg(msg)"
              >
                <Icon name="mdi:delete-outline" size="14" />
              </button>
            </div>
          </div>

          <!-- Text -->
          <p
            v-if="msg.text"
            class="msg-text"
            :class="{ expanded: expanded[msg.id] }"
          >
            {{ msg.text }}
          </p>
          <button
            v-if="msg.text && msg.text.length > 300"
            class="expand-btn"
            @click="expanded[msg.id] = !expanded[msg.id]"
          >
            {{
              expanded[msg.id]
                ? $t("gramkit.saves.collapse")
                : $t("gramkit.saves.expand")
            }}
          </button>

          <!-- URLs -->
          <div v-if="msg.urls?.length" class="url-list">
            <a
              v-for="url in msg.urls.slice(0, 3)"
              :key="url"
              :href="url"
              target="_blank"
              rel="noopener noreferrer"
              class="url-chip"
            >
              <Icon name="mdi:link-variant" size="12" />
              {{ truncateUrl(url) }}
            </a>
          </div>

          <!-- Media indicator -->
          <div v-if="msg.hasMedia" class="media-indicator">
            <Icon
              :name="
                msg.mediaType === 'photo'
                  ? 'mdi:image-outline'
                  : 'mdi:file-outline'
              "
              size="14"
            />
            {{ msg.fileName ?? msg.mediaType }}
          </div>

          <!-- Tags -->
          <div v-if="getLocalData(msg.id).tags.length" class="tag-row">
            <span
              v-for="tag in getLocalData(msg.id).tags"
              :key="tag"
              class="tag-chip"
            >
              #{{ tag }}
              <button class="tag-remove" @click.stop="removeTag(msg.id, tag)">
                <Icon name="mdi:close" size="10" />
              </button>
            </span>
          </div>

          <!-- Note -->
          <div v-if="getLocalData(msg.id).note" class="msg-note">
            <Icon name="mdi:note-text-outline" size="13" />
            {{ getLocalData(msg.id).note }}
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore && !loading" class="load-more-row">
        <SharedUiButtonBase
          :loading="loadingMore"
          icon-left="mdi:chevron-down"
          variant="outline"
          @click="loadMore"
        >
          {{ $t("gramkit.saves.loadMore") }}
        </SharedUiButtonBase>
      </div>

      <SharedUiFeedbackEmptyState
        v-if="!messages.length && !loading"
        icon="mdi:bookmark-multiple-outline"
        title="gramkit.saves.empty"
        description="gramkit.saves.emptyDesc"
        size="lg"
      />
      <SharedUiFeedbackEmptyState
        v-if="messages.length && !filtered.length && !loading"
        icon="mdi:magnify"
        title="gramkit.saves.noResults"
        description="gramkit.saves.noResultsDesc"
        size="md"
      />
    </template>

    <!-- Tag modal -->
    <SharedUiDialogReusableDialog
      v-model="showTagModal"
      :title="$t('gramkit.saves.tagModalTitle')"
      max-width="420px"
    >
      <div class="tag-modal-body">
        <div class="quick-tags">
          <button
            v-for="qt in quickTags"
            :key="qt"
            class="qt-btn"
            :class="{ active: editingTags.includes(qt) }"
            @click="toggleEditTag(qt)"
          >
            #{{ qt }}
          </button>
        </div>
        <SharedUiFormBaseInput
          v-model="newTag"
          :placeholder="$t('gramkit.saves.newTag')"
          icon-left="mdi:tag-outline"
          @keyup.enter="addEditTag"
        />
        <div v-if="editingTags.length" class="editing-tags">
          <span v-for="tag in editingTags" :key="tag" class="tag-chip">
            #{{ tag }}
            <button class="tag-remove" @click="toggleEditTag(tag)">
              <Icon name="mdi:close" size="10" />
            </button>
          </span>
        </div>
        <SharedUiFormBaseTextarea
          v-model="editingNote"
          :label="$t('gramkit.saves.note')"
          :placeholder="$t('gramkit.saves.notePlaceholder')"
          :rows="3"
        />
        <div class="tag-modal-actions">
          <SharedUiButtonBase variant="outline" @click="showTagModal = false">
            {{ $t("gramkit.saves.cancel") }}
          </SharedUiButtonBase>
          <SharedUiButtonBase icon-left="mdi:check" @click="saveTagData">
            {{ $t("gramkit.saves.save") }}
          </SharedUiButtonBase>
        </div>
      </div>
    </SharedUiDialogReusableDialog>

    <!-- Bulk delete confirm -->
    <SharedUiDialogReusableDialog
      v-model="showBulkConfirm"
      :title="$t('gramkit.saves.bulkDeleteTitle')"
      max-width="420px"
    >
      <div class="confirm-body">
        <p>{{ $t("gramkit.saves.bulkDeleteMsg", { n: selected.length }) }}</p>
        <div class="confirm-actions">
          <SharedUiButtonBase
            variant="outline"
            @click="showBulkConfirm = false"
          >
            {{ $t("gramkit.saves.cancel") }}
          </SharedUiButtonBase>
          <SharedUiButtonBase
            variant="error"
            icon-left="mdi:delete-sweep-outline"
            :loading="bulkDeleting"
            @click="doBulkDelete"
          >
            {{ $t("gramkit.saves.confirm") }}
          </SharedUiButtonBase>
        </div>
      </div>
    </SharedUiDialogReusableDialog>
  </div>
</template>

<script setup>
const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, getSession, getCreds } = useTelegram();

const loading = ref(false);
const loadingMore = ref(false);
const loadPct = ref(0);
const messages = ref([]);
const search = ref("");
const typeFilter = ref("all");
const selectedTags = ref([]);
const expanded = ref({});
const fetchLimit = ref(200);
const nextOffsetId = ref(null);
const hasMore = ref(false);

// Bulk selection
const selected = ref([]);
const bulkDeleting = ref(false);
const showBulkConfirm = ref(false);

const toggleSelect = (id) => {
  selected.value.includes(id)
    ? (selected.value = selected.value.filter((s) => s !== id))
    : selected.value.push(id);
};
const allFilteredSelected = computed(
  () =>
    filtered.value.length > 0 &&
    filtered.value.every((m) => selected.value.includes(m.id)),
);
const toggleSelectAll = () => {
  allFilteredSelected.value
    ? (selected.value = selected.value.filter(
        (id) => !filtered.value.find((m) => m.id === id),
      ))
    : filtered.value.forEach((m) => {
        if (!selected.value.includes(m.id)) selected.value.push(m.id);
      });
};
const confirmBulkDelete = () => {
  showBulkConfirm.value = true;
};
const doBulkDelete = async () => {
  showBulkConfirm.value = false;
  bulkDeleting.value = true;
  try {
    const { deleted } = await $fetch("/api/tg/saves/delete", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        msgIds: selected.value.map(Number),
      },
    });
    messages.value = messages.value.filter(
      (m) => !selected.value.includes(m.id),
    );
    $toast.success(`${t("gramkit.saves.deleted")} ${deleted}`);
    selected.value = [];
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    bulkDeleting.value = false;
  }
};

// Local metadata
const LOCAL_KEY = "gk_saves_meta";
const localData = ref(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}"));
const getLocalData = (id) => localData.value[id] ?? { tags: [], note: "" };
const saveLocal = () =>
  localStorage.setItem(LOCAL_KEY, JSON.stringify(localData.value));

// Tag modal
const showTagModal = ref(false);
const editingMsgId = ref(null);
const editingTags = ref([]);
const editingNote = ref("");
const newTag = ref("");
const quickTags = [
  "important",
  "work",
  "job",
  "read-later",
  "idea",
  "link",
  "funny",
  "news",
  "personal",
];

const openTagModal = (msg) => {
  editingMsgId.value = msg.id;
  const d = getLocalData(msg.id);
  editingTags.value = [...d.tags];
  editingNote.value = d.note ?? "";
  newTag.value = "";
  showTagModal.value = true;
};
const toggleEditTag = (tag) => {
  editingTags.value.includes(tag)
    ? (editingTags.value = editingTags.value.filter((t) => t !== tag))
    : editingTags.value.push(tag);
};
const addEditTag = () => {
  const tag = newTag.value.trim().replace(/^#/, "").toLowerCase();
  if (tag && !editingTags.value.includes(tag)) editingTags.value.push(tag);
  newTag.value = "";
};
const saveTagData = () => {
  localData.value[editingMsgId.value] = {
    tags: editingTags.value,
    note: editingNote.value,
  };
  saveLocal();
  showTagModal.value = false;
};
const removeTag = (msgId, tag) => {
  if (!localData.value[msgId]) return;
  localData.value[msgId].tags = localData.value[msgId].tags.filter(
    (t) => t !== tag,
  );
  saveLocal();
};
const toggleTag = (tag) => {
  selectedTags.value.includes(tag)
    ? (selectedTags.value = selectedTags.value.filter((t) => t !== tag))
    : selectedTags.value.push(tag);
};

const allTags = computed(() => {
  const tags = new Set();
  Object.values(localData.value).forEach((d) =>
    d.tags?.forEach((t) => tags.add(t)),
  );
  return [...tags];
});

const typeFilters = computed(() => [
  { v: "all", label: t("gramkit.saves.all"), icon: "mdi:all-inclusive" },
  { v: "text", label: t("gramkit.saves.text"), icon: "mdi:text" },
  { v: "media", label: t("gramkit.saves.media"), icon: "mdi:image-outline" },
  { v: "link", label: t("gramkit.saves.links"), icon: "mdi:link-variant" },
  {
    v: "forwarded",
    label: t("gramkit.saves.forwarded"),
    icon: "mdi:share-outline",
  },
  { v: "tagged", label: t("gramkit.saves.tagged"), icon: "mdi:tag-outline" },
]);

const filtered = computed(() => {
  let res = messages.value;
  if (typeFilter.value === "text")
    res = res.filter((m) => m.text && !m.hasMedia);
  if (typeFilter.value === "media") res = res.filter((m) => m.hasMedia);
  if (typeFilter.value === "link") res = res.filter((m) => m.urls?.length > 0);
  if (typeFilter.value === "forwarded") res = res.filter((m) => m.isForwarded);
  if (typeFilter.value === "tagged")
    res = res.filter((m) => getLocalData(m.id).tags.length > 0);
  if (selectedTags.value.length)
    res = res.filter((m) =>
      selectedTags.value.every((tag) => getLocalData(m.id).tags.includes(tag)),
    );
  if (search.value.trim())
    res = res.filter((m) =>
      m.text?.toLowerCase().includes(search.value.toLowerCase()),
    );
  return res;
});

const statCards = computed(() => [
  {
    key: "total",
    label: "gramkit.saves.stats.total",
    value: messages.value.length,
    icon: "mdi:bookmark-multiple-outline",
    color: "blue",
  },
  {
    key: "text",
    label: "gramkit.saves.stats.text",
    value: messages.value.filter((m) => m.text && !m.hasMedia).length,
    icon: "mdi:text",
    color: "purple",
  },
  {
    key: "media",
    label: "gramkit.saves.stats.media",
    value: messages.value.filter((m) => m.hasMedia).length,
    icon: "mdi:image-outline",
    color: "green",
  },
  {
    key: "tagged",
    label: "gramkit.saves.stats.tagged",
    value: Object.values(localData.value).filter((d) => d.tags?.length).length,
    icon: "mdi:tag-outline",
    color: "orange",
  },
]);

const loadSaved = async (offsetId = 0) => {
  loading.value = true;
  loadPct.value = 0;
  if (!offsetId) {
    messages.value = [];
    selected.value = [];
  }
  try {
    const result = await $fetch("/api/tg/saves/list", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        limit: fetchLimit.value,
        offsetId,
      },
    });
    messages.value = offsetId
      ? [...messages.value, ...result.messages]
      : result.messages;
    nextOffsetId.value = result.nextOffsetId;
    hasMore.value = result.hasMore;
    loadPct.value = 100;
    if (!offsetId)
      $toast.success(`${messages.value.length} ${t("gramkit.saves.loaded")}`);
  } catch (e) {
    $toast.error(
      t("gramkit.toast.error") + ": " + (e.data?.message ?? e.message),
    );
  } finally {
    loading.value = false;
  }
};

const loadMore = async () => {
  if (!nextOffsetId.value || loadingMore.value) return;
  loadingMore.value = true;
  try {
    const result = await $fetch("/api/tg/saves/list", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        limit: fetchLimit.value,
        offsetId: nextOffsetId.value,
      },
    });
    messages.value = [...messages.value, ...result.messages];
    nextOffsetId.value = result.nextOffsetId;
    hasMore.value = result.hasMore;
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    loadingMore.value = false;
  }
};

const deleteMsg = async (msg) => {
  try {
    await $fetch("/api/tg/saves/delete", {
      method: "POST",
      body: {
        ...getCreds(),
        session: getSession(),
        msgIds: [parseInt(msg.id)],
      },
    });
    messages.value = messages.value.filter((m) => m.id !== msg.id);
    selected.value = selected.value.filter((id) => id !== msg.id);
    $toast.success(t("gramkit.saves.deleted"));
  } catch {
    $toast.error(t("gramkit.toast.error"));
  }
};

const copy = async (text) => {
  if (!text) return;
  await navigator.clipboard.writeText(text);
  $toast.success(t("gramkit.toast.copied"));
};

const exportAll = () => {
  const lines = filtered.value.map((m) => {
    const d = getLocalData(m.id);
    const tags = d.tags.length
      ? `[${d.tags.map((t) => "#" + t).join(" ")}]`
      : "";
    const note = d.note ? `Note: ${d.note}` : "";
    const fwd =
      m.isForwarded && m.forwardedFrom?.fromName
        ? `Fwd: ${m.forwardedFrom.fromName}`
        : "";
    const urls = m.urls?.length ? `URLs: ${m.urls.join(", ")}` : "";
    return `--- ${formatDate(m.date)} ${tags} ${fwd}\n${m.text ?? "[media]"}\n${[urls, note].filter(Boolean).join("\n")}\n`;
  });
  const blob = new Blob([lines.join("\n")], {
    type: "text/plain;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "saved-messages.txt";
  a.click();
  URL.revokeObjectURL(url);
  $toast.success(t("gramkit.saves.exported"));
};

const msgIcon = (msg) => {
  if (msg.hasMedia && msg.mediaType === "photo") return "mdi:image-outline";
  if (msg.hasMedia) return "mdi:file-outline";
  if (msg.urls?.length) return "mdi:link-variant";
  if (msg.isForwarded) return "mdi:share-outline";
  return "mdi:text";
};

const formatDate = (ts) =>
  new Date(ts * 1000).toLocaleString(
    locale.value === "ar" ? "ar-EG" : "en-GB",
    {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

const truncateUrl = (url) => {
  try {
    const u = new URL(url);
    const path =
      u.pathname.length > 20 ? u.pathname.slice(0, 20) + "…" : u.pathname;
    return u.hostname + path;
  } catch {
    return url.slice(0, 35) + "…";
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
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &.saves {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    border: 1.5px solid rgba(245, 158, 11, 0.2);
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

.header-actions {
  margin-inline-start: auto;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

/* Limit stepper */
.limit-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.limit-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 0 2px;
}
.limit-input-wrap {
  display: flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  height: 38px;
}
.limit-step {
  width: 30px;
  height: 100%;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
  &:hover:not(:disabled) {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.08);
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}
.limit-input {
  width: 46px;
  border: none;
  background: none;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  font-family: "Tajawal", sans-serif;
  color: var(--text-primary);
  outline: none;
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
}

.loading-wrap {
  padding: 32px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.load-msg {
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.search-input {
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
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 11px;
  font-size: 0.76rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.18s;
  &.active {
    background: #f59e0b;
    color: #fff;
  }
}
.tag-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-pill {
  padding: 4px 11px;
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
    background: #f59e0b;
    border-color: #f59e0b;
    color: #fff;
  }
}

/* Bulk bar */
.bulk-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 0.82rem;
}
.bulk-check-label {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  color: var(--text-sub);
  font-weight: 600;
  input {
    accent-color: #f59e0b;
  }
}
.bulk-count {
  color: #f59e0b;
  font-weight: 700;
}

/* Message list */
.msg-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.msg-card {
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: card-in 0.25s ease both;
  &--tagged {
    border-color: rgba(245, 158, 11, 0.35);
  }
  &--selected {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.03);
  }
}
@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.msg-select {
  display: flex;
  align-items: center;
  input {
    accent-color: #f59e0b;
    cursor: pointer;
    width: 15px;
    height: 15px;
  }
}
.msg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.msg-type-icon {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  flex-shrink: 0;
}
.msg-date {
  font-size: 0.73rem;
  color: var(--text-muted);
}
.fwd-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  border: 1px solid rgba(99, 102, 241, 0.2);
  font-size: 0.7rem;
  font-weight: 600;
  max-width: 160px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.msg-actions {
  margin-inline-start: auto;
  display: flex;
  gap: 6px;
}
.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
  &:hover {
    color: var(--text-primary);
    background: var(--border-color);
  }
  &.danger:hover {
    color: #ef4444;
    border-color: #ef4444;
  }
}
.msg-text {
  font-size: 0.87rem;
  color: var(--text-primary);
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow: hidden;
  &.expanded {
    max-height: none;
  }
}
.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #f59e0b;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  padding: 0;
  align-self: flex-start;
}

/* URLs */
.url-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.url-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 7px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  color: var(--text-sub);
  font-size: 0.74rem;
  font-weight: 600;
  text-decoration: none;
  max-width: 220px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  &:hover {
    color: #f59e0b;
    border-color: rgba(245, 158, 11, 0.4);
  }
}

.media-indicator {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 7px;
  background: var(--bg-elevated);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 260px;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-size: 0.74rem;
  font-weight: 600;
}
.tag-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
  display: flex;
  opacity: 0.6;
  &:hover {
    opacity: 1;
  }
}
.msg-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-sub);
  background: var(--bg-elevated);
  border-radius: 8px;
  padding: 8px 10px;
  line-height: 1.5;
}

/* Load more */
.load-more-row {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

/* Tag modal */
.tag-modal-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
}
.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.qt-btn {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.18s;
  &.active {
    background: #f59e0b;
    border-color: #f59e0b;
    color: #fff;
  }
}
.editing-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* Confirm */
.confirm-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 0;
}
.confirm-body p {
  font-size: 0.9rem;
  color: var(--text-sub);
  margin: 0;
  line-height: 1.6;
}
.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
