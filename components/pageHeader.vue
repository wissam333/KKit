<template>
  <div class="header-wrapper">
    <header :class="headerClasses">
      <div class="bg-image" :style="backgroundStyle"></div>

      <div class="overlay"></div>

      <div
        class="flag-decoration"
        data-aos="fade-in"
        data-aos-duration="1200"
      >
        <div class="shard shard-white"></div>
      </div>

      <div class="sport-icons">
        <Icon name="game-icons:throwing-ball" class="sport-icon" />
        <Icon name="ic:twotone-sports-handball" class="sport-icon" />
        <Icon name="mdi:run" class="sport-icon" />
      </div>

      <div
        class="container h-100 position-relative d-flex align-items-center"
      >
        <h2
          class="display-4 fw-bold text-white mb-0 page-title"
          :data-aos="isRtl ? 'fade-left' : 'fade-right'"
          data-aos-duration="800"
        >
          {{ title }}
        </h2>
      </div>

      <!-- Mobile Breadcrumb -->
      <div class="mobile-breadcrumb" data-aos="fade-up" data-aos-delay="200">
        <div class="container">
          <div class="breadcrumb-content">
            <NuxtLink to="/" class="breadcrumb-home">
              <Icon name="iconamoon:home-fill" />
            </NuxtLink>
            <Icon
              :name="isRtl ? 'mdi:chevron-left' : 'mdi:chevron-right'"
              class="breadcrumb-separator"
            />
            <span class="breadcrumb-current">{{ currentLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Desktop Breadcrumb Tab -->
      <div class="breadcrumb-tab" data-aos="fade-up" data-aos-delay="200">
        <div class="container">
          <div class="tab-content">
            <div class="icon-box">
              <Icon name="mdi:home-outline" />
            </div>
            <div class="links text-uppercase">
              <NuxtLink
                to="/"
                class="text-dark text-decoration-none hover-red"
              >
                {{ homeLabel }}
              </NuxtLink>
              <span class="mx-2 separator">/</span>
              <span class="current fw-bold text-red">
                {{ currentLabel }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  </div>
</template>

<script setup lang="ts">
// import AOS from "aos";
// import "aos/dist/aos.css";
type PageHeaderProps = {
  title: string
  bgImage?: string
  noImg?: boolean
  homeLabel?: string
  currentLabel: string
}

const props = withDefaults(defineProps<PageHeaderProps>(), {
  bgImage: "",
  noImg: true,
  homeLabel: "Home",
})

const { title, bgImage, noImg, homeLabel, currentLabel } = toRefs(props)
const { locale } = useI18n()

const isRtl = computed(() => locale.value === "ar")

const headerClasses = computed(() => [
  "page-header",
  noImg.value ? "no-img" : "",
  isRtl.value ? "is-rtl" : "is-ltr",
])

const backgroundStyle = computed(() =>
  bgImage.value && !noImg.value
    ? { backgroundImage: `url(${bgImage.value})` }
    : {},
)

// onMounted(() => {
//   AOS.init({
//     once: true,
//     duration: 600,
//     easing: "ease-out-cubic",
//   });
// });
</script>

<style lang="scss" scoped>
// ─── Tokens ───────────────────────────────────────────────────────────────────
$color-uae-red: #ff0000;
$color-uae-green: #007330;
$color-uae-white: #ffffff;
$color-uae-black: #00000093;
$color-dark-bg: #070606;
$transition-speed: 0.3s;
$pattern-opacity: 0.2;
// ─── Wrapper ──────────────────────────────────────────────────────────────────
.header-wrapper {
  position: relative;
  width: 100%;
}

// ─── Page Header ──────────────────────────────────────────────────────────────
.page-header {
  position: relative;
  overflow: hidden;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  background-color: $color-dark-bg;
  height: 400px;

  @media (max-width: 991px) {
    height: 230px; // Ensure mum height on very small screens
  }

  @media (max-width: 480px) {
    height: 280px;
  }

  &.no-img {
  background: linear-gradient(135deg, $color-uae-black 0%, #222 100%);
  &::before {
    content: "";
    position: absolute;
    inset: 0;
    opacity: 0.05;
    background-repeat: repeat;
    background-image: url("data:image/svg+xml,%3Csvg width='100' height='60' viewBox='0 0 100 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.3'%3E%3Cpath d='M0 0 h100 v60 h-100 z' /%3E%3Cpath d='M0 15 Q 25 15 25 30 Q 25 45 0 45' /%3E%3Cpath d='M0 5 Q 40 5 40 30 Q 40 55 0 55' stroke-dasharray='4 2' /%3E%3Cline x1='30' y1='28' x2='30' y2='32' /%3E%3Cline x1='100' y1='0' x2='100' y2='60' /%3E%3C/g%3E%3C/svg%3E");
  }
}

  // ── Background Image ──────────────────────────────────────────────────────
  .bg-image {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center 30%;
    z-index: 1;
    transition: transform 6s ease-out;
  }

  &:hover .bg-image {
    transform: scale(1.05);
  }

  // ── Overlay ───────────────────────────────────────────────────────────────
  .overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to right,
      rgba($color-uae-black, 0.85) 0%,
      rgba($color-uae-black, 0.4) 50%,
      rgba($color-uae-black, 0.1) 100%
    );
    z-index: 2;

    .is-rtl & {
      background: linear-gradient(
        to left,
        rgba($color-uae-black, 0.85) 0%,
        rgba($color-uae-black, 0.4) 50%,
        rgba($color-uae-black, 0.1) 100%
      );
    }
  }

  // ── Flag Decoration Shards ────────────────────────────────────────────────
  .flag-decoration {
    position: absolute;
    z-index: 3;
    top: 0;
    inset-inline-end: -80px;
    height: 100%;
    width: 25%;
    display: flex;
    transform: skewX(-20deg);
    pointer-events: none;

    @media (max-width: 991px) {
      inset-inline-end: -40px;
      width: 30%;
    }

    .shard {
      height: 100%;
      flex-shrink: 0;
    }

    .shard-white {
      flex-grow: 1;
      background-color: rgba($color-uae-white, 0.1);
      backdrop-filter: blur(4px);
    }

    .is-rtl & {
      transform: skewX(20deg);
    }
  }

  // ── Sport Icons ───────────────────────────────────────────────────────────
  .sport-icons {
    position: absolute;
    z-index: 4;
    inset-inline-end: 3%;
    bottom: 25%;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    opacity: 0.3;

    @media (max-width: 991px) {
      bottom: 30%;
      inset-inline-end: 2%;
      gap: 0.8rem;
    }

    @media (max-width: 480px) {
      display: none; // Hide on very small screens to save space
    }

    .sport-icon {
      font-size: 2.5rem;
      color: $color-uae-white;

      @media (max-width: 991px) {
        font-size: 1.8rem;
      }
    }
  }

  // ── Container & Title ─────────────────────────────────────────────────────
  .container {
    z-index: 5;
    position: relative;

    .page-title {
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 800;
      text-shadow: 2px 4px 15px rgba(0, 0, 0, 0.8);
      max-width: 80%;

      @media (max-width: 991px) {
        font-size: 2rem !important;
        max-width: 90%;
      }

      @media (max-width: 480px) {
        font-size: 1.5rem !important;
        letter-spacing: 1px;
        max-width: 100%;
      }
    }
  }

  // ── Mobile Breadcrumb (New) ──────────────────────────────────────────────
  .mobile-breadcrumb {
    display: none;

    @media (max-width: 991px) {
      display: block;
      position: absolute;
      bottom: 15px;
      left: 0;
      width: 100%;
      z-index: 10;
    }

    .breadcrumb-content {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 30px;
      width: fit-content;
      max-width: 90%;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);

      @media (max-width: 480px) {
        padding: 6px 12px;
        gap: 6px;
      }
    }

    .breadcrumb-home {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      text-decoration: none;
      background: rgba(255, 255, 255, 0.2);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      transition: all 0.2s ease;

      @media (max-width: 480px) {
        width: 24px;
        height: 24px;
        font-size: 0.9rem;
      }

      &:hover {
        background: $color-uae-red;
      }
    }

    .breadcrumb-separator {
      color: rgba(255, 255, 255, 0.6);
      font-size: 1.2rem;

      @media (max-width: 480px) {
        font-size: 1rem;
      }
    }

    .breadcrumb-current {
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

      @media (max-width: 480px) {
        font-size: 0.75rem;
      }
    }
  }

  // ── Desktop Breadcrumb Tab ────────────────────────────────────────────────
  .breadcrumb-tab {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    z-index: 6;

    @media (max-width: 991px) {
      display: none;
    }

    .tab-content {
      display: inline-flex;
      align-items: center;
      background: $color-uae-white;
      padding: 15px 35px 15px 20px;
      border-top-right-radius: 30px;
      box-shadow: 0 -5px 25px rgba(0, 0, 0, 0.15);
      gap: 15px;
      position: relative;
      overflow: hidden;

      &::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background-color: $color-uae-red;
      }

      .icon-box {
        background: $color-uae-black;
        color: $color-uae-white;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-size: 1.2rem;
        transition: background $transition-speed;
        &:hover {
          background: $color-uae-red;
        }
      }

      .links {
        font-size: 0.95rem;
        font-weight: 700;
        letter-spacing: 1px;
        color: #333;
        .hover-red {
          transition: color $transition-speed;
          &:hover {
            color: $color-uae-red !important;
          }
        }
        .text-red {
          color: $color-uae-red;
        }
        .separator {
          color: #aaa;
        }
      }
    }
  }
}


// Additional Mobile Optimizations
@media (max-width: 991px) {
  .page-header {
    .container {
      .page-title {
        margin-top: -20px; // Adjust title position for mobile
      }
    }
  }
}

@media (max-width: 480px) {
  .page-header {
    .container {
      .page-title {
        margin-top: -10px;
        line-height: 1.2;
      }
    }
  }
}

// Handle very small devices
@media (max-width: 360px) {
  .page-header {
    .mobile-breadcrumb {
      .breadcrumb-current {
        font-size: 0.7rem;
      }
    }
  }
}
</style>
