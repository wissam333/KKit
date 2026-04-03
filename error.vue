<template>
  <div class="error-page">
    <div class="container">
      <div class="error-wrapper text-center">
        <div class="icon-box" data-aos="zoom-in">
          <div class="pulse-ring"></div>
          <Icon
            :name="
              error.statusCode === 404
                ? 'uil:search-alt'
                : 'uil:exclamation-triangle'
            "
            class="main-icon"
          />
        </div>

        <h1 class="display-1 fw-bold">{{ error.statusCode }}</h1>
        <h2 class="mb-4">
          {{
            isAr
              ? errorCodeMap[error.statusCode]?.titleAr
              : errorCodeMap[error.statusCode]?.titleEn
          }}
        </h2>
        <p class="text-muted mb-5 mx-auto message-text">
          {{
            isAr
              ? errorCodeMap[error.statusCode]?.descAr
              : errorCodeMap[error.statusCode]?.descEn
          }}
        </p>

        <div class="d-flex flex-wrap justify-content-center gap-3">
          <button
            @click="handleClearError"
            class="btn btn-primary btn-lg px-5 rounded-pill shadow-sm"
          >
            <Icon name="uil:home" class="me-2" />
            {{ isAr ? "العودة للرئيسية" : "Back to Home" }}
          </button>

          <NuxtLink
            to="/contact-us"
            class="btn btn-outline-secondary btn-lg px-5 rounded-pill"
          >
            {{ isAr ? "تواصل معنا" : "Contact Support" }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="decoration-blob blob-1"></div>
    <div class="decoration-blob blob-2"></div>
  </div>
</template>

<script setup>
const props = defineProps({
  error: Object,
});

const { locale } = useI18n();
const isAr = computed(() => locale.value === "ar");

// Map errors to friendly medical messages
const errorCodeMap = {
  404: {
    titleEn: "Page Not Found",
    titleAr: "الصفحة غير موجودة",
    descEn:
      "The medical resource or page you are looking for might have been moved or doesn't exist.",
    descAr:
      "المورد الطبي أو الصفحة التي تبحث عنها قد تم نقلها أو أنها غير موجودة حالياً.",
  },
  500: {
    titleEn: "System Error",
    titleAr: "خطأ في النظام",
    descEn:
      "We're experiencing a technical issue. Our team has been notified and is working to fix it.",
    descAr:
      "نواجه مشكلة تقنية حالياً. تم إخطار فريقنا الفني ونعمل على إصلاحها في أقرب وقت.",
  },
};

const handleClearError = () => clearError({ redirect: "/" });

// SEO for Error Page
useHead({
  title: isAr.value
    ? `خطأ ${props.error.statusCode}`
    : `Error ${props.error.statusCode}`,
  meta: [{ name: "robots", content: "noindex, follow" }],
});
</script>

<style lang="scss" scoped>
$medical-blue: #39d3ee;
$main-green: $primary; // matching your brand-green

.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8fafc;
  position: relative;
  overflow: hidden;
  padding: 20px;
      font-family: "alinma";
}

.error-wrapper {
  position: relative;
  z-index: 2;

  .message-text {
    max-width: 500px;
    font-size: 1.1rem;
    line-height: 1.6;
  }
}

.icon-box {
  position: relative;
  width: 150px;
  height: 150px;
  margin: 0 auto 30px;
  display: flex;
  align-items: center;
  justify-content: center;

  .main-icon {
    font-size: 5rem;
    color: $main-green;
    z-index: 2;
  }

  .pulse-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    background: rgba($main-green, 0.1);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
}

.btn-primary {
  background-color: $main-green;
  border-color: $main-green;
  &:hover {
    background-color: $main-green;
  }
}

// Blobs matching your UI style
.decoration-blob {
  position: absolute;
  filter: blur(80px);
  z-index: 1;
  border-radius: 50%;
}
.blob-1 {
  width: 300px;
  height: 300px;
  background: rgba($main-green, 0.1);
  top: -100px;
  left: -100px;
}
.blob-2 {
  width: 200px;
  height: 200px;
  background: rgba($medical-blue, 0.1);
  bottom: -50px;
  right: -50px;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.1);
    opacity: 0.3;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.8;
  }
}

[dir="rtl"] {
  .me-2 {
    margin-left: 0.5rem !important;
    margin-right: 0 !important;
  }
}
</style>
