<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue'

import type { Game } from '../game/Game'
import { EaterGame } from '../games/eater/EaterGame';
import { EaterEngine } from '../games/eater/EaterEngine';
import { EaterRender } from '../games/eater/EaterRender';

const props = withDefaults(
  defineProps<{
    autoStart?: boolean
    game: 'eater'
  }>(),
  { autoStart: true },
)

const emit = defineEmits<{
  leave: []
}>()

const rootRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const gameRef = ref<Game | null>(null)

const componentName = computed(() => {
  switch (props.game) {
    case 'eater':
      return 'Eater'
    default:
      return 'Default'
  }
})

let resizeObserver: ResizeObserver | null = null
let isMouseDragging = false
let lastMouseClientX = 0
let lastMouseClientY = 0

function applyCanvasSize() {
  const root = rootRef.value
  const canvas = canvasRef.value
  if (!root || !canvas) return

  const w = root.clientWidth
  const h = root.clientHeight
  if (w < 1 || h < 1) return

  canvas.width = w
  canvas.height = h
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (ctx) {
    // scale canvas to match device pixel ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  // gameRef.value?.resizeCanvas(w, h)
}

function initGame() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  gameRef.value?.stop()
  
  const game = new EaterGame({
    ctx,
    engine: new EaterEngine(),
    renderer: new EaterRender(ctx),
  });

  setTimeout(() => {
    gameRef.value = game
    game.resizeCanvas(canvas.width, canvas.height, true)

    if (props.autoStart) {
      game.start()
    }
  }, 100)
}

function togglePauseResume() {
  const game = gameRef.value
  if (!game) return

  if (game.gameState === 'running') {
    game.pause()
  } else if (game.gameState === 'paused') {
    game.resume()
  }
}

function toggleStartStop() {
  const game = gameRef.value
  if (!game) return

  if (game.gameState === 'wait_for_start') {
    game.start()
  } else {
    game.stop()
  }
}

function restartGame() {
  gameRef.value?.restart()
}

function onKeyDown(event: KeyboardEvent) {
  if (event.code === 'Space') {
    event.preventDefault()
    togglePauseResume()
  } else if (event.code === 'Enter') {
    event.preventDefault()
    toggleStartStop()
  }
}

function onCanvasMouseDown(event: MouseEvent) {
  if (event.button === 0) {
    isMouseDragging = true
    lastMouseClientX = event.clientX
    lastMouseClientY = event.clientY
  }
}

function onCanvasMouseMove(event: MouseEvent) {
  const game = gameRef.value
  if (!game) return

  if (!isMouseDragging) {
    if (game.gameState === 'running') {
      // TODO: may be add some logic
    }
    return
  }

  const deltaX = event.clientX - lastMouseClientX
  const deltaY = event.clientY - lastMouseClientY

  game.cameraMove(deltaX, deltaY)

  lastMouseClientX = event.clientX
  lastMouseClientY = event.clientY
}

function stopCanvasDrag() {
  isMouseDragging = false
}

function teardownGame() {
  stopCanvasDrag()
  gameRef.value?.stop()
  gameRef.value = null
  // glRef = null
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)

  nextTick(() => {
    resizeObserver = new ResizeObserver(() => {
      applyCanvasSize()
    })

    if (rootRef.value) {
      resizeObserver.observe(rootRef.value)
    }

    initGame()
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  resizeObserver?.disconnect()
  resizeObserver = null
  teardownGame()
})
</script>

<template>
  <div class="game-shell">
    <header class="game-toolbar">
      <button type="button" class="back-btn" @click="emit('leave')">Back</button>
      <span class="game-label">
        {{ componentName }}
      </span>
      <button type="button" class="toolbar-btn" @click="togglePauseResume">
        Pause / Resume (Space)
      </button>
      <button type="button" class="toolbar-btn" @click="toggleStartStop">
        Stop / Start (Enter)
      </button>
      <button type="button" class="toolbar-btn" @click="restartGame">
        Restart
      </button>
    </header>
    <div
      ref="rootRef"
      class="canvas-wrap"
      @mousedown="onCanvasMouseDown"
      @mousemove="onCanvasMouseMove"
      @mouseup="stopCanvasDrag"
      @mouseleave="stopCanvasDrag"
    >
      <canvas ref="canvasRef" class="game-canvas" />
    </div>
  </div>
</template>

<style scoped>
.game-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 0.75rem;
}

.game-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.back-btn {
  font: inherit;
  cursor: pointer;
  padding: 0.35rem 0.75rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.back-btn:hover {
  border-color: var(--accent-dim);
  color: var(--text-h);
}

.toolbar-btn {
  font: inherit;
  cursor: pointer;
  padding: 0.35rem 0.75rem;
  border-radius: 0.35rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.toolbar-btn:hover:not(:disabled) {
  border-color: var(--accent-dim);
  color: var(--text-h);
}

.toolbar-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.game-label {
  font-size: 0.85rem;
  color: var(--muted);
}

.canvas-wrap {
  flex: 1;
  max-height: calc(100vh - 4rem);
  min-width: 1024px;
  min-height: 768px;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--input-bg);
  overflow: hidden;
}

.game-canvas {
  display: block;
}
</style>
