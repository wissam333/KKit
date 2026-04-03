<template>
  <div class="draw-layout">
    <div class="draw-toolbar">
      <div class="tool-group">
        <button
          v-for="tool in drawTools"
          :key="tool.value"
          class="draw-tool-btn"
          :class="{ active: drawTool === tool.value }"
          @click="drawTool = tool.value"
        >
          <Icon :name="tool.icon" size="16" />
        </button>
      </div>
      <div class="tool-divider" />
      <div class="tool-group">
        <button
          v-for="c in colors"
          :key="c"
          class="color-btn"
          :class="{ active: drawColor === c }"
          :style="{ background: c }"
          @click="drawColor = c"
        />
      </div>
      <div class="tool-divider" />
      <div class="tool-group">
        <span class="size-label">{{ brushSize }}px</span>
        <input
          type="range"
          v-model.number="brushSize"
          min="2"
          max="30"
          class="size-slider"
        />
      </div>
      <div class="tool-divider" />
      <button class="draw-tool-btn" @click="undo">
        <Icon name="mdi:undo" size="16" />
      </button>
      <button class="draw-tool-btn" @click="clearCanvas">
        <Icon name="mdi:trash-can-outline" size="16" />
      </button>
      <button class="draw-tool-btn" @click="downloadCanvas">
        <Icon name="mdi:download-outline" size="16" />
      </button>
    </div>

    <div class="canvas-wrap">
      <canvas
        ref="canvasEl"
        class="draw-canvas"
        @mousedown="startDraw"
        @mousemove="onDraw"
        @mouseup="stopDraw"
        @mouseleave="stopDraw"
        @touchstart.prevent="startTouch"
        @touchmove.prevent="onTouch"
        @touchend="stopDraw"
      />
    </div>

    <div class="draw-side">
      <MirrorSharePanel :url="shareUrl" :status="peer.status.value" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";

const props = defineProps({ sessionId: String });
const peer = useMirrorPeer();
const canvasEl = ref(null);

const drawTool = ref("pen");
const drawColor = ref("#1e293b");
const brushSize = ref(4);
const drawTools = [
  { value: "pen", icon: "mdi:pencil" },
  { value: "marker", icon: "mdi:marker" },
  { value: "eraser", icon: "mdi:eraser" },
];
const colors = [
  "#1e293b",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#ffffff",
];

const strokes = ref([]);
let drawing = false,
  lastX = 0,
  lastY = 0;
let strokeBuffer = [],
  flushTimer = null;

const { fetchIp, buildUrl } = useLocalUrl();
const shareUrl = computed(() => {
  if (!import.meta.client || !peer.peerId.value) return "";
  return buildUrl(
    `/toolbox/mirror?peer=${peer.peerId.value}&mode=screen&role=viewer`,
  );
});

const gp = (e) => {
  const el = canvasEl.value;
  const r = el.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * el.width) / r.width,
    y: ((e.clientY - r.top) * el.height) / r.height,
  };
};

const applyStroke = (ctx, s) => {
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(s.x0, s.y0);
  ctx.lineTo(s.x1, s.y1);
  ctx.stroke();
  ctx.globalAlpha = 1;
};

const startDraw = (e) => {
  drawing = true;
  const p = gp(e);
  lastX = p.x;
  lastY = p.y;
};
const onDraw = (e) => {
  if (!drawing || !canvasEl.value) return;
  const { x, y } = gp(e);
  const ctx = canvasEl.value.getContext("2d");
  const color = drawTool.value === "eraser" ? "#ffffff" : drawColor.value;
  const size =
    drawTool.value === "marker" ? brushSize.value * 2.5 : brushSize.value;
  const alpha = drawTool.value === "marker" ? 0.4 : 1;
  const s = { x0: lastX, y0: lastY, x1: x, y1: y, color, size, alpha };
  applyStroke(ctx, s);
  strokes.value.push(s);
  strokeBuffer.push(s);
  lastX = x;
  lastY = y;

  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      if (strokeBuffer.length)
        peer.broadcast({ type: "draw", strokes: strokeBuffer });
      strokeBuffer = [];
      flushTimer = null;
    }, 40);
  }
};
const stopDraw = () => {
  drawing = false;
};
const startTouch = (e) => {
  const t = e.touches[0];
  startDraw({ clientX: t.clientX, clientY: t.clientY });
};
const onTouch = (e) => {
  const t = e.touches[0];
  onDraw({ clientX: t.clientX, clientY: t.clientY });
};

const replayAll = (ctx, list) => {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvasEl.value.width, canvasEl.value.height);
  list.forEach((s) => applyStroke(ctx, s));
};

const undo = () => {
  if (!strokes.value.length) return;
  strokes.value.pop();
  replayAll(canvasEl.value.getContext("2d"), strokes.value);
  peer.broadcast({ type: "draw_full", strokes: strokes.value });
};

const clearCanvas = () => {
  strokes.value = [];
  const ctx = canvasEl.value.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvasEl.value.width, canvasEl.value.height);
  peer.broadcast({ type: "draw_clear" });
};

const downloadCanvas = () => {
  const a = document.createElement("a");
  a.download = "whiteboard.png";
  a.href = canvasEl.value.toDataURL();
  a.click();
};

const initCanvas = () => {
  if (!canvasEl.value) return;
  const el = canvasEl.value;
  el.width = el.offsetWidth || 800;
  el.height = el.offsetHeight || 480;
  const ctx = el.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, el.width, el.height);
};

onMounted(async () => {
  await fetchIp();
  await nextTick();
  initCanvas();
  await peer.init(props.sessionId);

  peer.onMessage((data) => {
    if (!canvasEl.value) return;
    const ctx = canvasEl.value.getContext("2d");
    if (data.type === "draw") {
      data.strokes.forEach((s) => {
        strokes.value.push(s);
        applyStroke(ctx, s);
      });
    }
    if (data.type === "draw_full") {
      strokes.value = data.strokes;
      replayAll(ctx, strokes.value);
    }
    if (data.type === "draw_clear") {
      strokes.value = [];
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvasEl.value.width, canvasEl.value.height);
    }
    // New joiner — send full canvas state
    if (data.type === "hello") {
      peer.broadcast({ type: "draw_full", strokes: strokes.value });
    }
  });

  // Send current canvas when someone new joins
  watch(peer.connectedPeers, () => {
    peer.broadcast({ type: "draw_full", strokes: strokes.value });
  });
});

onUnmounted(() => {
  if (flushTimer) clearTimeout(flushTimer);
});
</script>

<style scoped lang="scss">
.draw-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  grid-template-rows: auto 1fr;
  gap: 12px;
}
.draw-toolbar {
  grid-column: 1/2;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 12px;
}
.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.tool-divider {
  width: 1px;
  height: 22px;
  background: var(--border-color);
  margin: 0 4px;
}
.draw-tool-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: none;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  &.active {
    background: rgba(20, 184, 166, 0.12);
    border-color: rgba(20, 184, 166, 0.3);
    color: #14b8a6;
  }
  &:hover:not(.active) {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }
}
.color-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
  &.active {
    border-color: var(--text-primary);
    transform: scale(1.2);
  }
}
.size-label {
  font-size: 0.72rem;
  color: var(--text-muted);
  min-width: 30px;
  text-align: center;
}
.size-slider {
  width: 70px;
  accent-color: #14b8a6;
}
.canvas-wrap {
  grid-column: 1/2;
  border-radius: 14px;
  overflow: hidden;
  border: 1.5px solid var(--border-color);
  min-height: 440px;
}
.draw-canvas {
  width: 100%;
  height: 100%;
  min-height: 440px;
  cursor: crosshair;
  display: block;
  touch-action: none;
  background: #fff;
}
.draw-side {
  grid-column: 2/3;
  grid-row: 1/3;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
