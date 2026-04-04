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
      <!-- ── Header ── -->
      <div class="tool-header">
        <NuxtLink to="/gramkit" class="back-btn"
          ><Icon name="mdi:arrow-left" size="16"
        /></NuxtLink>
        <div class="tool-header-icon saves">
          <Icon name="mdi:bookmark-multiple-outline" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.saves.title") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.saves.subtitle") }}</p>
        </div>
        <div class="ms-auto d-flex gap-2">
          <SharedUiButtonBase
            v-if="!messages.length"
            :loading="loading"
            icon-left="mdi:download-outline"
            @click="loadSaved"
            >{{ $t("gramkit.saves.load") }}</SharedUiButtonBase
          >
          <template v-else>
            <SharedUiButtonBase
              icon-left="mdi:refresh"
              variant="outline"
              size="sm"
              @click="loadSaved"
            >
              {{ $t("gramkit.saves.reload") }}
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

      <!-- ── Loading ── -->
      <div v-if="loading" class="loading-wrap">
        <SharedUiIndicatorsProgress
          type="linear"
          :value="loadPct"
          color="primary"
          :show-value="true"
        />
        <span class="load-msg">{{ $t("gramkit.saves.loading") }}</span>
      </div>

      <!-- ── Controls ── -->
      <div v-if="messages.length && !loading" class="controls-row">
        <!-- Search -->
        <SharedUiFormBaseInput
          v-model="search"
          :placeholder="$t('gramkit.saves.search')"
          icon-left="mdi:magnify"
          clearable
          class="search-input"
        />
        <!-- Type filter -->
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
        <!-- Tag filter -->
        <div class="tag-pills">
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

      <!-- ── Stats row ── -->
      <SharedUiCardsStats
        v-if="messages.length && !loading"
        :stats="statCards"
        :columns="4"
        :icon-size="20"
      />

      <!-- ── Message list ── -->
      <div v-if="filtered.length && !loading" class="msg-list">
        <div
          v-for="msg in filtered"
          :key="msg.id"
          class="msg-card"
          :class="{ 'msg-card--tagged': getLocalData(msg.id).tags.length }"
        >
          <!-- Head -->
          <div class="msg-head">
            <span class="msg-type-icon">
              <Icon :name="msgIcon(msg)" size="15" />
            </span>
            <span class="msg-date">{{ formatDate(msg.date) }}</span>
            <div class="ms-auto d-flex gap-1">
              <!-- Tag button -->
              <button
                class="action-btn"
                :title="$t('gramkit.saves.addTag')"
                @click="openTagModal(msg)"
              >
                <Icon name="mdi:tag-plus-outline" size="14" />
              </button>
              <!-- Copy -->
              <button
                class="action-btn"
                :title="$t('gramkit.saves.copy')"
                @click="copy(msg.text)"
              >
                <Icon name="mdi:content-copy" size="14" />
              </button>
              <!-- Delete from saved -->
              <button
                class="action-btn danger"
                :title="$t('gramkit.saves.delete')"
                @click="deleteMsg(msg)"
              >
                <Icon name="mdi:delete-outline" size="14" />
              </button>
            </div>
          </div>

          <!-- Text content -->
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
            {{ msg.mediaType }}
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

    <!-- ── Tag modal ── -->
    <SharedUiDialogReusableDialog
      v-model="showTagModal"
      :title="$t('gramkit.saves.tagModalTitle')"
      max-width="420px"
    >
      <div class="tag-modal-body">
        <!-- Quick tag buttons -->
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
        <!-- Custom tag input -->
        <SharedUiFormBaseInput
          v-model="newTag"
          :placeholder="$t('gramkit.saves.newTag')"
          icon-left="mdi:tag-outline"
          @keyup.enter="addEditTag"
        />
        <!-- Current tags on this message -->
        <div v-if="editingTags.length" class="editing-tags">
          <span v-for="tag in editingTags" :key="tag" class="tag-chip">
            #{{ tag }}
            <button class="tag-remove" @click="toggleEditTag(tag)">
              <Icon name="mdi:close" size="10" />
            </button>
          </span>
        </div>
        <!-- Note input -->
        <SharedUiFormBaseTextarea
          v-model="editingNote"
          :label="$t('gramkit.saves.note')"
          :placeholder="$t('gramkit.saves.notePlaceholder')"
          :rows="3"
        />
        <div class="tag-modal-actions">
          <SharedUiButtonBase variant="outline" @click="showTagModal = false">{{
            $t("gramkit.saves.cancel")
          }}</SharedUiButtonBase>
          <SharedUiButtonBase icon-left="mdi:check" @click="saveTagData">{{
            $t("gramkit.saves.save")
          }}</SharedUiButtonBase>
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
const loadPct = ref(0);
const messages = ref([]);
const search = ref("");
const typeFilter = ref("all");
const selectedTags = ref([]);
const expanded = ref({});

const LOCAL_KEY = "gk_saves_meta";
const localData = ref(JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}"));
const getLocalData = (id) => localData.value[id] ?? { tags: [], note: "" };
const saveLocal = () =>
  localStorage.setItem(LOCAL_KEY, JSON.stringify(localData.value));

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
  { v: "tagged", label: t("gramkit.saves.tagged"), icon: "mdi:tag-outline" },
]);

const filtered = computed(() => {
  let res = messages.value;
  if (typeFilter.value === "text")
    res = res.filter((m) => m.text && !m.hasMedia);
  if (typeFilter.value === "media") res = res.filter((m) => m.hasMedia);
  if (typeFilter.value === "link")
    res = res.filter((m) => m.text && /https?:\/\//i.test(m.text));
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
    value: messages.value.filter((m) => m.text).length,
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

const loadSaved = async () => {
  loading.value = true;
  loadPct.value = 0;
  messages.value = [];
  try {
    const result = await $fetch("/api/tg/saves/list", {
      method: "POST",
      body: { ...getCreds(), session: getSession() },
    });
    messages.value = result.messages;
    loadPct.value = 100;
    $toast.success(`${messages.value.length} ${t("gramkit.saves.loaded")}`);
  } catch (e) {
    $toast.error(
      t("gramkit.toast.error") + ": " + (e.data?.message ?? e.message),
    );
  } finally {
    loading.value = false;
  }
};

const deleteMsg = async (msg) => {
  try {
    await $fetch("/api/tg/saves/delete", {
      method: "POST",
      body: { ...getCreds(), session: getSession(), msgId: parseInt(msg.id) },
    });
    messages.value = messages.value.filter((m) => m.id !== msg.id);
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
    return `--- ${formatDate(m.date)} ${tags}\n${m.text ?? "[media]"}\n${note}\n`;
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
  if (msg.text && /https?:\/\//i.test(msg.text)) return "mdi:link-variant";
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
  margin-inline-start: auto;
}
.d-flex {
  display: flex;
}
.gap-1 {
  gap: 6px;
}
.gap-2 {
  gap: 10px;
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

/* ── Controls ── */
.controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
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

/* ── Message list ── */
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
  animation: card-in 0.3s ease both;
  &--tagged {
    border-color: rgba(245, 158, 11, 0.35);
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

.msg-head {
  display: flex;
  align-items: center;
  gap: 8px;
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

/* ── Tag modal ── */
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
</style>
