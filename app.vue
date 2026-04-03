<template>
  <div>
    <ElementsLoader />
    <NuxtLayout>
      <main id="main-content">
        <NuxtPage />
      </main>
    </NuxtLayout>
    <SharedUiFeedbackToast position="center" :duration="6000" />
  </div>
</template>

<script setup>
const { locale } = useI18n();

// Dynamic Page Title Template
useHead({
  htmlAttrs: {
    lang: computed(() => locale.value),
    dir: computed(() => (locale.value === "ar" ? "rtl" : "ltr")),
  },
});

// Global Default Meta
useSeoMeta({
  ogSiteName: "KKit",
  twitterCard: "summary_large_image",
  ogImage: "/logo.png",
});
</script>
