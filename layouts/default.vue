<template>
  <div id="main-content" :class="locale === 'ar' ? 'bodyAR' : 'bodyEN'">
    <SharedNavbar></SharedNavbar>
    <main class="main-slot">
      <slot />
    </main>
  </div>
</template>

<script setup>
const { locale } = useI18n();
const { init } = useTheme();

onMounted(() => init());
</script>

<style lang="scss" scoped>
#main-content {
  overflow-x: hidden;
  min-height: 100dvh;
  background: var(--bg-page);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

/* All pages sit below the fixed header */
.main-slot {
  padding-top: 62px;

  @media (max-width: 480px) {
    padding-top: 54px;
  }
}
</style>
