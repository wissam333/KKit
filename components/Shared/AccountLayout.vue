<!-- components/Shared/AccountLayout.vue -->
<template>
  <div>
    <div :class="locale === 'ar' ? 'bodyAR' : 'bodyEN'">
      <SharedNavbar />
      <SharedAccountHeader :user="computedUser" />

      <div class="cont tabs">
        <SharedUiNavigationTabs
          v-model="activeTab"
          :tabs="normalizedTabsForUi"
          variant="pills"
          @update:modelValue="onTabChange"
        />
      </div>
      <main class="account-main cont">
        <slot />
      </main>

      <SharedFooter />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  user: {
    type: Object,
    default: () => ({}),
  },
  tabs: {
    type: Array,
    required: true,
    validator: (value) =>
      value.every((tab) => tab.key && tab.labelKey && (tab.to || tab.path)),
  },
  basePath: {
    type: String,
    default: "",
  },
  activeTabKey: {
    type: String,
    default: null,
  },
});

const { locale } = useI18n();
const router = useRouter();
const route = useRoute();

// ── Build full `to` for every tab ──────────────────────────────────
const computedTabs = computed(() =>
  props.tabs.map((tab) => ({
    ...tab,
    to: tab.to ?? (props.basePath ? `${props.basePath}/${tab.path}` : tab.path),
  })),
);

// ── Convert to what SharedUiNavigationTabs actually expects ─────────
const normalizedTabsForUi = computed(() =>
  computedTabs.value.map((tab) => ({
    value: tab.key,
    label: tab.labelKey,
    icon: tab.icon ?? undefined,
    badge: tab.badge ?? undefined,
    badgeVariant: tab.badgeVariant ?? undefined,
    disabled: tab.disabled ?? false,
  })),
);

// ── Resolve active tab ─────────────────────────────────────────────
const activeTab = computed({
  get() {
    if (props.activeTabKey) return props.activeTabKey;
    const currentPath = route.path;
    const matched = computedTabs.value.find(
      (tab) => currentPath === tab.to || currentPath.startsWith(tab.to + "/"),
    );
    return matched?.key ?? props.tabs[0]?.key;
  },
  set(newKey) {
    onTabChange(newKey);
  },
});

// ── Normalise user object ──────────────────────────────────────────
const computedUser = computed(() => {
  const u = props.user || {};
  if (!u.fullNameAr && !u.fullNameEn && !u.arName && !u.enName) {
    const full = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return { ...u, fullNameAr: full, fullNameEn: full };
  }
  return u;
});

// ── Tab navigation ─────────────────────────────────────────────────
const onTabChange = (newKey) => {
  const tab = computedTabs.value.find((t) => t.key === newKey);
  if (tab) router.push(tab.to);
};

provide(
  "layoutUser",
  computed(() => props.user),
);
</script>

<style lang="scss" scoped>
.bodyAR,
.bodyEN {
  transition: direction 0s;
}

.account-main {
  min-height: calc(100vh - 280px);
  padding-top: 32px;
  padding-bottom: 48px;
}
.tabs {
  overflow-x: auto;
}
</style>
