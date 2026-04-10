<template>
  <div>
    <ElementsLoader />
    <VitePwaManifest />
    <PwaInstallBanner />
    <NuxtLayout>
      <main id="main-content">
        <NuxtPage />
      </main>
    </NuxtLayout>
    <SharedUiFeedbackToast position="center" :duration="6000" />
    <GlobalCallBanner></GlobalCallBanner>
  </div>
</template>

<script setup>
const { locale } = useI18n();

useHead({
  htmlAttrs: {
    lang: computed(() => locale.value),
    dir: computed(() => (locale.value === "ar" ? "rtl" : "ltr")),
  },
});

useSeoMeta({
  ogSiteName: "KKit",
  twitterCard: "summary_large_image",
  ogImage: "/logo.png",
});
</script>
