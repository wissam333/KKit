<template>
  <div class="draw-layout">
    <!-- Toolbar — scrollable on mobile -->
    <div class="draw-toolbar-wrap">
      <div class="draw-toolbar">
        <div class="tool-group">
          <button
            v-for="tool in drawTools"
            :key="tool.value"
            class="draw-tool-btn"
            :class="{ active: drawTool === tool.value }"
            @click="drawTool = tool.value"
          >
            <Icon :name="tool.icon" size="15" />
          </button>
        </div>

        <div class="tool-divider" />

        <div class="tool-group colors-group">
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

        <div class="tool-group size-group">
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

        <div class="tool-group">
          <button class="draw-tool-btn" @click="undo" title="Undo">
            <Icon name="mdi:undo" size="15" />
          </button>
          <button class="draw-tool-btn" @click="clearCanvas" title="Clear">
            <Icon name="mdi:trash-can-outline" size="15" />
          </button>
          <button
            class="draw-tool-btn"
            @click="downloadCanvas"
            title="Download"
          >
            <Icon name="mdi:download-outline" size="15" />
          </button>
        </div>
      </div>
    </div>

    <!-- Canvas -->
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

    <!-- Share sidebar -->
    <div class="draw-side">
      <MirrorSharePanel :url="shareUrl" :status="peer.status.value" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";

const props = defineProps({
  sessionId: String,
  hostPeerId: { type: String, default: "" },
});

const peer = useMirrorPeer();
const canvasEl = ref(null);
const isViewer = computed(() => !!props.hostPeerId);

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

const shareUrl = computed(() => {
  if (!import.meta.client || !peer.peerId.value) return "";
  return `${window.location.origin}/toolbox/mirror?peer=${peer.peerId.value}&mode=draw`;
});

const gp = (e) => {
  const el = canvasEl.value,
    r = el.getBoundingClientRect();
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
  if (isViewer.value) return;
  drawing = true;
  const p = gp(e);
  lastX = p.x;
  lastY = p.y;
};

const onDraw = (e) => {
  if (!drawing || !canvasEl.value || isViewer.value) return;
  const { x, y } = gp(e),
    ctx = canvasEl.value.getContext("2d");
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
  if (!strokes.value.length || isViewer.value) return;
  strokes.value.pop();
  replayAll(canvasEl.value.getContext("2d"), strokes.value);
  peer.broadcast({ type: "draw_full", strokes: strokes.value });
};

const clearCanvas = () => {
  if (isViewer.value) return;
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
  el.height = el.offsetHeight || 400;
  const ctx = el.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, el.width, el.height);
};

const handleMessage = (data) => {
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
};

onMounted(async () => {
  await nextTick();
  initCanvas();
  if (isViewer.value) {
    await peer.init();
    peer.onMessage(handleMessage);
    peer.connectTo(props.hostPeerId);
    watch(peer.connectedPeers, (peers) => {
      if (peers.length > 0) peer.broadcast({ type: "draw_request_full" });
    });
  } else {
    await peer.init(props.sessionId);
    peer.onMessage((data) => {
      handleMessage(data);
      if (data.type === "draw_request_full")
        peer.broadcast({ type: "draw_full", strokes: strokes.value });
    });
    watch(peer.connectedPeers, () => {
      peer.broadcast({ type: "draw_full", strokes: strokes.value });
    });
  }
});

onUnmounted(() => {
  if (flushTimer) clearTimeout(flushTimer);
});
</script>

<style scoped lang="scss">
/* ─── Layout ─────────────────────────────────────────── */
.draw-layout {
  display: grid;
  grid-template-columns: 1fr 180px;
  grid-template-rows: auto 1fr;
  gap: 12px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
}

/* ─── Toolbar — scrollable on mobile ────────────────── */
.draw-toolbar-wrap {
  grid-column: 1 / 2;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 700px) {
    grid-column: 1 / -1;
  }
}

.draw-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface);
  border: 1.5px solid var(--border-color);
  border-radius: 12px;
  padding: 7px 10px;
  width: max-content;
  min-width: 100%;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 3px;
}

.tool-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 3px;
  flex-shrink: 0;
}

.draw-tool-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: none;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

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

.colors-group {
  gap: 5px;
}

.color-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  flex-shrink: 0;
  transition: all 0.15s;
  &.active {
    border-color: var(--text-primary);
    transform: scale(1.2);
  }
}

.size-group {
  gap: 6px;
}

.size-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  min-width: 28px;
  text-align: center;
}

.size-slider {
  width: 64px;
  accent-color: #14b8a6;
  flex-shrink: 0;
}

/* ─── Canvas ─────────────────────────────────────────── */
.canvas-wrap {
  grid-column: 1 / 2;
  border-radius: 14px;
  overflow: hidden;
  border: 1.5px solid var(--border-color);
  min-height: 380px;

  @media (max-width: 700px) {
    grid-column: 1 / -1;
    min-height: 280px;
  }
  @media (max-width: 480px) {
    min-height: 220px;
  }
}

.draw-canvas {
  width: 100%;
  height: 100%;
  min-height: 380px;
  cursor: crosshair;
  display: block;
  touch-action: none;
  background: #fff;

  @media (max-width: 700px) {
    min-height: 280px;
  }
  @media (max-width: 480px) {
    min-height: 220px;
  }
}

/* ─── Side / share ───────────────────────────────────── */
.draw-side {
  grid-column: 2 / 3;
  grid-row: 1 / 3;
  display: flex;
  flex-direction: column;
  gap: 10px;

  @media (max-width: 700px) {
    grid-column: 1 / -1;
    grid-row: auto;
  }
}
</style>
