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
        <div class="tool-header-icon red">
          <Icon name="mdi:broom" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.tools.cleaner.name") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.tools.cleaner.desc") }}</p>
        </div>
      </div>

      <!-- Safety notice -->
      <div class="safety-banner">
        <Icon name="mdi:shield-check-outline" size="18" />
        {{ $t("gramkit.cleaner.safety") }}
      </div>

      <!-- Channel picker -->
      <div class="picker-row">
        <SharedUiFormBaseSelect
          v-model="selectedChannel"
          :options="channelOptions"
          :placeholder="$t('gramkit.cleaner.pickGroup')"
          :loading="loadingDialogs"
          icon-left="mdi:account-group-outline"
          searchable
          class="channel-select"
        />
        <SharedUiButtonBase
          :loading="scanning"
          :disabled="!selectedChannel"
          icon-left="mdi:magnify"
          variant="outline"
          @click="previewMessages"
        >
          {{ $t("gramkit.cleaner.preview") }}
        </SharedUiButtonBase>
      </div>

      <!-- Preview results -->
      <template v-if="myMessages.length && !scanning">
        <div class="preview-header">
          <span class="preview-count"
            >{{ myMessages.length }} {{ $t("gramkit.cleaner.msgFound") }}</span
          >
          <SharedUiButtonBase
            icon-left="mdi:delete-outline"
            variant="error"
            :loading="deleting"
            @click="confirmDelete"
          >
            {{ $t("gramkit.cleaner.deleteAll") }}
          </SharedUiButtonBase>
        </div>

        <div class="msg-list">
          <div
            v-for="msg in myMessages.slice(0, 20)"
            :key="msg.id"
            class="msg-row"
          >
            <Icon name="mdi:message-text-outline" size="14" class="msg-icon" />
            <span class="msg-preview">{{ truncate(msg.message, 120) }}</span>
            <span class="msg-date">{{ formatDate(msg.date) }}</span>
          </div>
          <div v-if="myMessages.length > 20" class="more-msgs">
            + {{ myMessages.length - 20 }} {{ $t("gramkit.cleaner.more") }}
          </div>
        </div>
      </template>

      <SharedUiFeedbackEmptyState
        v-if="!myMessages.length && !scanning"
        icon="mdi:broom"
        title="gramkit.cleaner.empty"
        description="gramkit.cleaner.emptyDesc"
        size="lg"
      />

      <!-- Confirm dialog -->
      <SharedUiDialogReusableDialog
        v-model="showConfirm"
        :title="$t('gramkit.cleaner.confirmTitle')"
      >
        <template #default>
          <p>
            {{ $t("gramkit.cleaner.confirmMsg", { count: myMessages.length }) }}
          </p>
        </template>

        <template #actions>
          <SharedUiButtonBase variant="ghost" @click="showConfirm = false">
            {{ $t("cancel") }}
          </SharedUiButtonBase>
          <SharedUiButtonBase variant="error" @click="doDelete">
            {{ $t("gramkit.cleaner.deleteAll") }}
          </SharedUiButtonBase>
        </template>
      </SharedUiDialogReusableDialog>
    </template>
  </div>
</template>

<script setup>
import { useTelegram } from "~/composables/useTelegram";

const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, getDialogs, getMessages, deleteMyMessages } =
  useTelegram();

const selectedChannel = ref(null);
const loadingDialogs = ref(false);
const scanning = ref(false);
const deleting = ref(false);
const dialogs = ref([]);
const myMessages = ref([]);
const showConfirm = ref(false);

const channelOptions = computed(() =>
  dialogs.value.map((d) => ({
    label: d.title,
    value: d.id?.toString(),
    icon: "mdi:account-group-outline",
  })),
);

onMounted(async () => {
  if (!isConnected.value) return;
  loadingDialogs.value = true;
  try {
    dialogs.value = await getDialogs();
  } finally {
    loadingDialogs.value = false;
  }
});

const previewMessages = async () => {
  scanning.value = true;
  myMessages.value = [];
  try {
    const dialog = dialogs.value.find(
      (d) => d.id?.toString() === selectedChannel.value,
    );
    const msgs = await getMessages(dialog.entity, { limit: 100 });
    // We show all messages — actual deletion only removes user's own
    myMessages.value = msgs.filter((m) => m.message);
    if (!myMessages.value.length) $toast.info(t("gramkit.cleaner.noMsgs"));
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    scanning.value = false;
  }
};

const confirmDelete = () => {
  showConfirm.value = true;
};

const doDelete = async () => {
  showConfirm.value = false;
  deleting.value = true;
  try {
    const dialog = dialogs.value.find(
      (d) => d.id?.toString() === selectedChannel.value,
    );
    const { deleted } = await deleteMyMessages(dialog.entity);
    $toast.success(
      `${t("gramkit.cleaner.deleted")} ${deleted} ${t("gramkit.cleaner.messages")}`,
    );
    myMessages.value = [];
  } catch {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    deleting.value = false;
  }
};

const truncate = (text, max) =>
  text?.length > max ? text.slice(0, max) + "…" : text;
const formatDate = (ts) =>
  new Date(ts * 1000).toLocaleDateString(
    locale.value === "ar" ? "ar-EG" : "en-GB",
  );

</script>

<style scoped lang="scss">
.tool-page {
  max-width: 800px;
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
  &.red {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1.5px solid rgba(239, 68, 68, 0.2);
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

.safety-banner {
  display: flex;
  align-items: center;
  gap: 9px;
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.84rem;
  color: #16a34a;
  margin-bottom: 18px;
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

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}
.preview-count {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-sub);
}

.msg-list {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 16px;
}
.msg-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  &:last-child {
    border-bottom: none;
  }
}
.msg-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.msg-preview {
  flex: 1;
  font-size: 0.83rem;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.msg-date {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}
.more-msgs {
  padding: 10px 16px;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
}
</style>
