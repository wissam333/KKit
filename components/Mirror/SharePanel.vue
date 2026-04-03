<template>
  <div class="share-panel">
    <div class="qr-label">{{ label || $t("scanToConnect") }}</div>
    <div class="qr-wrap">
      <canvas ref="qrEl" class="qr-canvas" />
      <div v-if="!url" class="qr-loading">
        <Icon name="mdi:loading" size="22" class="spin" />
      </div>
    </div>
    <div class="share-url">{{ url }}</div>
    <button class="copy-btn" @click="copy">
      <Icon :name="copied ? 'mdi:check' : 'mdi:content-copy'" size="14" />
      {{ copied ? $t("copied") : $t("copyLink") }}
    </button>
    <div class="peer-status" :class="status">
      <span class="status-dot" />
      {{ statusLabel }}
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";

const props = defineProps({
  url: String,
  label: String,
  status: { type: String, default: "idle" }, // idle|loading|ready|error
});

const { $toast } = useNuxtApp();
const { t } = useI18n();
const qrEl = ref(null);
const copied = ref(false);

const statusLabel = computed(
  () =>
    ({
      idle: t("notConnected"),
      loading: t("connecting"),
      ready: t("ready"),
      error: t("connectionError"),
    })[props.status] ?? "",
);

const loadQR = () =>
  new Promise((res, rej) => {
    if (window.QRCode) return res();
    const s = document.createElement("script");
    s.src =
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });

const renderQR = async (url) => {
  if (!qrEl.value || !url) return;
  await loadQR();
  // Clear previous
  qrEl.value.width = 160;
  qrEl.value.height = 160;
  const ctx = qrEl.value.getContext("2d");
  ctx.clearRect(0, 0, 160, 160);
  const tmp = document.createElement("div");
  document.body.appendChild(tmp);
  try {
    new window.QRCode(tmp, {
      text: url,
      width: 160,
      height: 160,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M,
    });
    const gen = tmp.querySelector("canvas");
    if (gen) ctx.drawImage(gen, 0, 0);
  } catch {}
  document.body.removeChild(tmp);
};

const copy = async () => {
  if (!props.url) return;
  await navigator.clipboard.writeText(props.url);
  copied.value = true;
  $toast?.success(t("copied"));
  setTimeout(() => (copied.value = false), 2000);
};

watch(
  () => props.url,
  (v) => {
    if (v) renderQR(v);
  },
);
onMounted(() => {
  if (props.url) renderQR(props.url);
});
</script>

<style scoped lang="scss">
.share-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
}
.qr-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}
.qr-wrap {
  position: relative;
}
.qr-canvas {
  border-radius: 10px;
  background: #fff;
  width: 160px;
  height: 160px;
  display: block;
}
.qr-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 10px;
}
.share-url {
  font-size: 0.6rem;
  color: var(--text-muted);
  word-break: break-all;
  text-align: center;
  max-width: 160px;
}
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: "Tajawal", sans-serif;
  background: rgba(20, 184, 166, 0.1);
  border: 1.5px solid rgba(20, 184, 166, 0.25);
  color: #14b8a6;
  cursor: pointer;
  width: 100%;
  justify-content: center;
  &:hover {
    background: rgba(20, 184, 166, 0.18);
  }
}
.peer-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--border-color);
  }
  &.ready {
    color: #22c55e;
    .status-dot {
      background: #22c55e;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
    }
  }
  &.loading {
    color: #f59e0b;
    .status-dot {
      background: #f59e0b;
    }
  }
  &.error {
    color: #ef4444;
    .status-dot {
      background: #ef4444;
    }
  }
}
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
