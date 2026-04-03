<template>
  <div id="main-content" :class="locale == 'ar' ? 'bodyAR' : 'bodyEN'">
    <slot />
  </div>
</template>

<script setup>
const { locale } = useI18n();
useLang().value = locale;
</script>

<style lang="scss" scoped>
#main-content {
  overflow-x: hidden !important;
}
</style>
