<template>
  <div class="tool-page" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
    <div v-if="!isConnected" class="guard">
      <SharedUiFeedbackEmptyState
        icon="mdi:archive-outline"
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
        <div class="tool-header-icon archiver">
          <Icon name="mdi:archive-arrow-down-outline" size="22" />
        </div>
        <div>
          <h1 class="tool-title">{{ $t("gramkit.archiver.title") }}</h1>
          <p class="tool-sub">{{ $t("gramkit.archiver.subtitle") }}</p>
        </div>
      </div>

      <!-- ── Safety banner ── -->
      <div class="info-banner">
        <Icon name="mdi:information-outline" size="17" />
        <span>{{ $t("gramkit.archiver.info") }}</span>
      </div>

      <!-- ── Tabs ── -->
      <SharedUiNavigationTabs
        v-model="activeTab"
        :tabs="tabs"
        variant="pills"
        class="mb-24"
      />

      <!-- ══ TAB: SCAN ══ -->
      <div v-if="activeTab === 'scan'">
        <!-- Rules builder -->
        <div class="rules-card">
          <div class="rules-title">{{ $t("gramkit.archiver.rules") }}</div>

          <div class="rule-row">
            <div class="rule-label">
              {{ $t("gramkit.archiver.rule.inactiveDays") }}
            </div>
            <div class="seg-control">
              <button
                v-for="d in [7, 14, 30, 60, 90]"
                :key="d"
                class="seg-btn"
                :class="{ active: rules.inactiveDays === d }"
                @click="rules.inactiveDays = d"
              >
                {{ d }}d
              </button>
            </div>
          </div>

          <div class="rule-row">
            <div class="rule-label">
              {{ $t("gramkit.archiver.rule.types") }}
            </div>
            <div class="type-checks">
              <label class="type-check">
                <input type="checkbox" v-model="rules.includeChannels" />
                <span>{{ $t("gramkit.archiver.typeChannels") }}</span>
              </label>
              <label class="type-check">
                <input type="checkbox" v-model="rules.includeGroups" />
                <span>{{ $t("gramkit.archiver.typeGroups") }}</span>
              </label>
              <label class="type-check">
                <input type="checkbox" v-model="rules.includePrivate" />
                <span>{{ $t("gramkit.archiver.typePrivate") }}</span>
              </label>
            </div>
          </div>

          <div class="rule-row">
            <div class="rule-label">
              {{ $t("gramkit.archiver.rule.minMessages") }}
            </div>
            <div class="seg-control">
              <button
                v-for="m in [0, 5, 10, 20, 50]"
                :key="m"
                class="seg-btn"
                :class="{ active: rules.minMessages === m }"
                @click="rules.minMessages = m"
              >
                {{ m === 0 ? $t("gramkit.archiver.any") : `< ${m}` }}
              </button>
            </div>
          </div>

          <div class="rule-row">
            <div class="rule-label">
              {{ $t("gramkit.archiver.rule.keywords") }}
            </div>
            <div class="kw-tags">
              <span v-for="kw in rules.skipIfContains" :key="kw" class="kw-tag">
                {{ kw }}
                <button class="kw-x" @click="removeSkipKw(kw)">
                  <Icon name="mdi:close" size="10" />
                </button>
              </span>
            </div>
            <div class="kw-add-row">
              <SharedUiFormBaseInput
                v-model="newSkipKw"
                :placeholder="$t('gramkit.archiver.skipKeyword')"
                size="sm"
                @keyup.enter="addSkipKw"
              />
              <SharedUiButtonBase
                icon-left="mdi:plus"
                size="sm"
                variant="outline"
                @click="addSkipKw"
                >{{ $t("gramkit.archiver.add") }}</SharedUiButtonBase
              >
            </div>
            <div class="rule-hint">{{ $t("gramkit.archiver.skipHint") }}</div>
          </div>

          <SharedUiButtonBase
            :loading="scanning"
            icon-left="mdi:magnify"
            class="w-full"
            @click="runScan"
          >
            {{ $t("gramkit.archiver.scan") }}
          </SharedUiButtonBase>
        </div>

        <!-- Progress -->
        <div v-if="scanning" class="scan-progress">
          <SharedUiIndicatorsProgress
            type="linear"
            :value="scanPct"
            color="primary"
            :show-value="true"
          />
          <span class="scan-msg">{{ scanMsg }}</span>
        </div>

        <!-- Results -->
        <template v-if="candidates.length && !scanning">
          <div class="results-header">
            <span class="results-count">
              {{ candidates.length }}
              {{ $t("gramkit.archiver.candidatesFound") }}
            </span>
            <div class="results-actions">
              <SharedUiButtonBase
                size="sm"
                variant="outline"
                icon-left="mdi:check-all"
                @click="selectAll"
              >
                {{ $t("gramkit.archiver.selectAll") }}
              </SharedUiButtonBase>
              <SharedUiButtonBase
                size="sm"
                variant="error"
                icon-left="mdi:archive-arrow-down"
                :disabled="!selected.length"
                :loading="archiving"
                @click="confirmArchive"
              >
                {{
                  $t("gramkit.archiver.archiveSelected", { n: selected.length })
                }}
              </SharedUiButtonBase>
            </div>
          </div>

          <div class="candidate-list">
            <div
              v-for="c in candidates"
              :key="c.id"
              class="candidate-card"
              :class="{ selected: selected.includes(c.id) }"
              @click="toggleSelect(c.id)"
            >
              <div class="cand-check">
                <Icon
                  :name="
                    selected.includes(c.id)
                      ? 'mdi:checkbox-marked-circle'
                      : 'mdi:checkbox-blank-circle-outline'
                  "
                  size="20"
                />
              </div>
              <div class="cand-icon">
                <Icon
                  :name="
                    c.type === 'channel'
                      ? 'mdi:bullhorn-outline'
                      : c.type === 'group'
                        ? 'mdi:account-group-outline'
                        : 'mdi:account-outline'
                  "
                  size="18"
                />
              </div>
              <div class="cand-info">
                <div class="cand-name">{{ c.title }}</div>
                <div class="cand-meta">
                  <span class="cand-badge" :class="c.type">{{ c.type }}</span>
                  <span class="cand-last"
                    >{{ $t("gramkit.archiver.lastMsg") }}:
                    {{ c.lastMsgLabel }}</span
                  >
                  <span v-if="c.msgCount !== null" class="cand-msgs"
                    >{{ c.msgCount }} {{ $t("gramkit.archiver.msgs") }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </template>

        <SharedUiFeedbackEmptyState
          v-if="!candidates.length && !scanning"
          icon="mdi:archive-outline"
          title="gramkit.archiver.empty"
          description="gramkit.archiver.emptyDesc"
          size="lg"
        />
      </div>

      <!-- ══ TAB: HISTORY ══ -->
      <div v-if="activeTab === 'history'">
        <SharedUiFeedbackEmptyState
          v-if="!history.length"
          icon="mdi:history"
          title="gramkit.archiver.historyEmpty"
          description="gramkit.archiver.historyEmptyDesc"
          size="lg"
        />
        <div v-else class="history-list">
          <div v-for="h in history" :key="h.id" class="history-row">
            <Icon
              name="mdi:archive-check-outline"
              size="16"
              class="history-icon"
            />
            <div class="history-name">{{ h.title }}</div>
            <div class="history-date">{{ h.archivedAt }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- Confirm dialog -->
    <SharedUiDialogReusableDialog
      v-model="showConfirm"
      :title="$t('gramkit.archiver.confirmTitle')"
      max-width="480px"
    >
      <div class="confirm-body">
        <p>{{ $t("gramkit.archiver.confirmMsg", { n: selected.length }) }}</p>
        <div class="confirm-actions">
          <SharedUiButtonBase variant="outline" @click="showConfirm = false">{{
            $t("gramkit.archiver.cancel")
          }}</SharedUiButtonBase>
          <SharedUiButtonBase
            variant="error"
            icon-left="mdi:archive-arrow-down"
            :loading="archiving"
            @click="doArchive"
          >
            {{ $t("gramkit.archiver.confirm") }}
          </SharedUiButtonBase>
        </div>
      </div>
    </SharedUiDialogReusableDialog>
  </div>
</template>

<script setup>
import { useTelegram } from "~/composables/useTelegram";

const { locale, t } = useI18n();
const { $toast } = useNuxtApp();
const { isConnected, client } = useTelegram();

const activeTab = ref("scan");
const tabs = computed(() => [
  { label: "gramkit.archiver.tabScan", value: "scan", icon: "mdi:magnify" },
  {
    label: "gramkit.archiver.tabHistory",
    value: "history",
    icon: "mdi:history",
  },
]);

// ── Rules ──
const rules = reactive({
  inactiveDays: 30,
  includeChannels: true,
  includeGroups: true,
  includePrivate: false,
  minMessages: 0,
  skipIfContains: [],
});
const newSkipKw = ref("");
const addSkipKw = () => {
  const kw = newSkipKw.value.trim();
  if (kw && !rules.skipIfContains.includes(kw)) rules.skipIfContains.push(kw);
  newSkipKw.value = "";
};
const removeSkipKw = (kw) => {
  rules.skipIfContains = rules.skipIfContains.filter((k) => k !== kw);
};

// ── Scan state ──
const scanning = ref(false);
const scanPct = ref(0);
const scanMsg = ref("");
const candidates = ref([]);
const selected = ref([]);
const archiving = ref(false);
const showConfirm = ref(false);
const history = ref(
  JSON.parse(localStorage.getItem("gk_archive_history") ?? "[]"),
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runScan = async () => {
  scanning.value = true;
  scanPct.value = 0;
  candidates.value = [];
  selected.value = [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - rules.inactiveDays);

  try {
    scanMsg.value = t("gramkit.archiver.scanningDialogs");
    const dialogs = await client.value.getDialogs({ limit: 300 });
    const total = dialogs.length;

    for (let i = 0; i < dialogs.length; i++) {
      const d = dialogs[i];
      scanPct.value = Math.round((i / total) * 100);
      scanMsg.value = d.title ?? "";

      // Type filter
      if (d.isChannel && !d.isGroup && !rules.includeChannels) continue;
      if (d.isGroup && !rules.includeGroups) continue;
      if (!d.isChannel && !d.isGroup && !rules.includePrivate) continue;

      // Skip if keyword in title
      const titleLower = (d.title ?? "").toLowerCase();
      if (
        rules.skipIfContains.some((kw) => titleLower.includes(kw.toLowerCase()))
      )
        continue;

      // Check last message date
      const lastMsgDate = d.date ? new Date(d.date * 1000) : null;
      if (!lastMsgDate || lastMsgDate >= cutoff) continue;

      // Check if already archived
      if (d.archived) continue;

      // Unread count check as proxy for engagement
      const msgCount = d.unreadCount ?? null;
      if (
        rules.minMessages > 0 &&
        msgCount !== null &&
        msgCount >= rules.minMessages
      )
        continue;

      const daysSince = Math.floor(
        (Date.now() - lastMsgDate.getTime()) / 86400000,
      );

      candidates.value.push({
        id: d.id?.toString(),
        title: d.title ?? d.name ?? "Unknown",
        type:
          d.isChannel && !d.isGroup
            ? "channel"
            : d.isGroup
              ? "group"
              : "private",
        lastMsgDate,
        lastMsgLabel: `${daysSince}d ago`,
        msgCount,
        entity: d.entity,
      });

      await sleep(50);
    }

    scanPct.value = 100;
    if (!candidates.value.length)
      $toast.info(t("gramkit.archiver.noCandidates"));
    else
      $toast.success(
        `${candidates.value.length} ${t("gramkit.archiver.candidatesFound")}`,
      );
  } catch (e) {
    $toast.error(t("gramkit.toast.error") + ": " + e.message);
  } finally {
    scanning.value = false;
  }
};

const toggleSelect = (id) => {
  selected.value.includes(id)
    ? (selected.value = selected.value.filter((s) => s !== id))
    : selected.value.push(id);
};
const selectAll = () => {
  selected.value =
    selected.value.length === candidates.value.length
      ? []
      : candidates.value.map((c) => c.id);
};

const confirmArchive = () => {
  showConfirm.value = true;
};

const doArchive = async () => {
  showConfirm.value = false;
  archiving.value = true;
  let done = 0;
  const toArchive = candidates.value.filter((c) =>
    selected.value.includes(c.id),
  );

  try {
    for (const c of toArchive) {
      try {
        // toggleDialogPin with archived flag — archives the dialog
        await client.value.invoke({
          _: "toggleDialogPin",
          peer: await client.value.getInputEntity(c.entity),
          pinned: false,
        });
        // Actually archive using the folderId approach
        await client.value.invoke({
          _: "foldersEditPeerFolders",
          folder_peers: [
            {
              _: "inputFolderPeer",
              peer: await client.value.getInputEntity(c.entity),
              folder_id: 1, // 1 = archived folder
            },
          ],
        });
        history.value.unshift({
          id: `${c.id}_${Date.now()}`,
          title: c.title,
          archivedAt: new Date().toLocaleDateString(
            locale.value === "ar" ? "ar-EG" : "en-GB",
          ),
        });
        done++;
      } catch {
        /* skip individual failures */
      }
      await sleep(300);
    }

    localStorage.setItem(
      "gk_archive_history",
      JSON.stringify(history.value.slice(0, 200)),
    );
    candidates.value = candidates.value.filter(
      (c) => !selected.value.includes(c.id),
    );
    selected.value = [];
    $toast.success(
      `${t("gramkit.archiver.archived")} ${done} ${t("gramkit.archiver.chats")}`,
    );
  } catch (e) {
    $toast.error(t("gramkit.toast.error"));
  } finally {
    archiving.value = false;
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
.mb-24 {
  margin-bottom: 24px;
}
.w-full {
  width: 100%;
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
  &.archiver {
    background: rgba(99, 102, 241, 0.1);
    color: #6366f1;
    border: 1.5px solid rgba(99, 102, 241, 0.2);
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

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  background: rgba(99, 102, 241, 0.07);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.82rem;
  color: #6366f1;
  margin-bottom: 20px;
  line-height: 1.5;
}

/* ── Rules card ── */
.rules-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.rules-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}
.rule-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-sub);
}
.rule-hint {
  font-size: 0.74rem;
  color: var(--text-muted);
}
.seg-control {
  display: flex;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  width: fit-content;
}
.seg-btn {
  padding: 7px 12px;
  font-size: 0.77rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.18s;
  &.active {
    background: #6366f1;
    color: #fff;
  }
}
.type-checks {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.type-check {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.83rem;
  color: var(--text-primary);
  cursor: pointer;
  input {
    accent-color: #6366f1;
  }
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
  color: var(--text-primary);
}
.kw-x {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--text-muted);
  display: flex;
  &:hover {
    color: #d32f2f;
  }
}
.kw-add-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

/* ── Scan progress ── */
.scan-progress {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.scan-msg {
  font-size: 0.78rem;
  color: var(--text-muted);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ── Results ── */
.results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 14px;
}
.results-count {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-sub);
}
.results-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.candidate-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.candidate-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.18s;
  &:hover {
    border-color: #6366f1;
  }
  &.selected {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.04);
  }
}
.cand-check {
  color: var(--text-muted);
  flex-shrink: 0;
  .selected & {
    color: #6366f1;
  }
}
.cand-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}
.cand-info {
  flex: 1;
  min-width: 0;
}
.cand-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.cand-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 3px;
}
.cand-badge {
  padding: 1px 7px;
  border-radius: 5px;
  font-size: 0.68rem;
  font-weight: 700;
  &.channel {
    background: rgba(42, 171, 238, 0.1);
    color: #2aabee;
  }
  &.group {
    background: rgba(34, 197, 94, 0.1);
    color: #16a34a;
  }
  &.private {
    background: rgba(124, 58, 237, 0.1);
    color: #7c3aed;
  }
}
.cand-last,
.cand-msgs {
  font-size: 0.73rem;
  color: var(--text-muted);
}

/* ── History ── */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 16px;
}
.history-icon {
  color: #6366f1;
  flex-shrink: 0;
}
.history-name {
  flex: 1;
  font-size: 0.87rem;
  font-weight: 600;
  color: var(--text-primary);
}
.history-date {
  font-size: 0.74rem;
  color: var(--text-muted);
}

/* ── Confirm dialog ── */
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
