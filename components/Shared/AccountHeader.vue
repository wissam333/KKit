<!-- components/Shared/AccountHeader.vue -->
<template>
  <div class="account-header">
    <div class="cont account-header__inner nav-margin">
      <!-- Avatar + Name -->
      <div class="account-header__user">
        <div class="account-header__avatar">
          <img
            v-if="user?.imageURL"
            :src="apiBase + user.imageURL"
            :alt="displayName"
          />
          <span v-else class="account-header__avatar-letter">
            {{ displayName?.charAt(0)?.toUpperCase() }}
          </span>
        </div>

        <div class="account-header__info">
          <h2 class="account-header__name">{{ displayName }}</h2>
          <span
            v-if="roleBadge"
            class="account-header__badge"
            :class="`badge--${roleBadge.type}`"
          >
            <Icon :name="roleBadge.icon" size="13" />
            {{ $t(roleBadge.label) }}
          </span>
        </div>
      </div>

      <!-- Right side actions -->
      <div class="account-header__actions">
        <button class="account-header__logout" @click="showLogoutDialog = true">
          <Icon name="mdi:logout" size="18" />
          <span class="logout-text">{{ $t("logout") }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ── Logout Confirmation Dialog ─────────────────────────────── -->
  <SharedUiDialogReusableDialog
    v-model="showLogoutDialog"
    :title="$t('confirmLogout')"
    max-width="420px"
  >
    <div class="logout-dialog-body">
      <div class="logout-dialog-icon">
        <Icon name="mdi:logout" size="36" />
      </div>
      <p class="logout-dialog-text">{{ $t("logoutConfirmMessage") }}</p>
      <p class="logout-dialog-name">{{ displayName }}</p>
    </div>

    <template #actions>
      <div class="d-flex gap-2 justify-content-end">
        <SharedUiButtonBase variant="outline" @click="showLogoutDialog = false">
          {{ $t("cancel") }}
        </SharedUiButtonBase>
        <SharedUiButtonBase
          variant="error"
          icon-left="mdi:logout"
          @click="confirmLogout"
        >
          {{ $t("logout") }}
        </SharedUiButtonBase>
      </div>
    </template>
  </SharedUiDialogReusableDialog>
</template>

<script setup>
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;
const props = defineProps({
  user: {
    type: Object,
    default: () => ({}),
  },
});

const { locale, t } = useI18n();
const { $toast } = useNuxtApp();

const showLogoutDialog = ref(false);

// ── Display name: Arabic first, fallback English ───────────────────
const displayName = computed(() => {
  if (locale.value === "ar") {
    return (
      props.user?.fullNameAr ||
      props.user?.arName ||
      props.user?.fullNameEn ||
      props.user?.enName ||
      `${props.user?.firstName || ""} ${props.user?.lastName || ""}`.trim() ||
      t("user")
    );
  }
  return (
    props.user?.fullNameEn ||
    props.user?.enName ||
    props.user?.fullNameAr ||
    props.user?.arName ||
    `${props.user?.firstName || ""} ${props.user?.lastName || ""}`.trim() ||
    t("user")
  );
});

// ── Account type badge ─────────────────────────────────────────────
const role = useRole();

const roleBadge = computed(() => {
  const type = (role?.value || "").toLowerCase();
  if (type === "academy")
    return { type: "academy", icon: "mdi:school", label: "academy" };
  if (type === "club")
    return { type: "club", icon: "mdi:shield-star-outline", label: "club" };
  if (type === "admin")
    return { type: "admin", icon: "mdi:shield-crown-outline", label: "admin" };
  return null;
});

// ── Logout ─────────────────────────────────────────────────────────
const confirmLogout = () => {
  showLogoutDialog.value = false;
  if (process.client) {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("role");
  }
  useToken().value = null;
  useMainToken().value = null;
  useAuth().value.isAuthenticated = false;
  useUserInfo().value = null;
  useRole().value = null;

  $toast?.success(t("logoutSuccess"));
  navigateTo("/auth/login");
};
</script>

<style lang="scss" scoped>
$primary: #d32f2f;
$primary-soft: rgba(211, 47, 47, 0.1);
$navy: #0c1739;

.account-header {
  background: #fff;
  border-bottom: 1px solid #e9ecef;
  padding: 18px 0;
  margin-bottom: 20px;

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 14px;
  }

  // ── User block ───────────────────────────────────────────────────
  &__user {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  &__avatar {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: $primary-soft;
    color: $primary;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    border: 2px solid rgba(211, 47, 47, 0.15);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__avatar-letter {
    font-size: 1.4rem;
    font-weight: 700;
    color: $primary;
    line-height: 1;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  &__name {
    font-size: 1.1rem;
    font-weight: 700;
    color: $navy;
    margin: 0;
    line-height: 1.2;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    width: fit-content;

    &.badge--academy {
      background: rgba(59, 130, 246, 0.1);
      color: #2563eb;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    &.badge--club {
      background: $primary-soft;
      color: $primary;
      border: 1px solid rgba(211, 47, 47, 0.2);
    }
    &.badge--admin {
      background: rgba(139, 92, 246, 0.1);
      color: #7c3aed;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }
  }

  // ── Right actions ────────────────────────────────────────────────
  &__actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__logout {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid #e9ecef;
    background: #f8f9fa;
    color: #6c757d;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: $primary;
      color: $primary;
      background: $primary-soft;
    }
  }
}

// ── Logout dialog body ────────────────────────────────────────────
.logout-dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 0;
  text-align: center;
}

.logout-dialog-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logout-dialog-text {
  font-size: 0.95rem;
  color: var(--text-primary, #2c3e50);
  margin: 0;
  line-height: 1.6;
}

.logout-dialog-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary, #2c3e50);
  margin: 0;
  padding: 0.4rem 1.1rem;
  background: #f8f9fa;
  border-radius: 10px;
  border: 1px solid #e9ecef;
}

@media (max-width: 576px) {
  .account-header {
    &__actions {
      .logout-text {
        display: none;
      }
    }
  }
}
</style>
