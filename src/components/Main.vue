<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Field from './Field.vue'

type TGames = 'eater'

const canvas2dSupported = ref(false)
const activeGame = ref<TGames | null>(null)

const webWorkerSupported = ref<boolean>(false)

onMounted(() => {
  const probe = document.createElement('canvas')
  canvas2dSupported.value = !!probe.getContext('2d')

  webWorkerSupported.value = typeof Worker !== 'undefined';

})

function start(game: TGames) {
  activeGame.value = game
}

function leave() {
  activeGame.value = null
}
</script>

<template>
  <main class="main">
    <template v-if="!activeGame">
      <div class="main-content">
        <h1 class="title">Web brains</h1>
  
        <div class="stack">
          <section class="card">
            <h2 class="card-title">Eater</h2>
            <p class="card-body">
              Canvas 2D supported:
              <span :class="canvas2dSupported ? 'ok' : 'bad'">
                {{ canvas2dSupported ? 'yes' : 'no' }}
              </span>
            </p>
            <button
              type="button"
              class="primary"
              :disabled="!canvas2dSupported || !webWorkerSupported"
              @click="start('eater')"
            >
              Start
            </button>
          </section>
        </div>
      </div>
    </template>

    <Field
      v-else
      :game="activeGame"
      :auto-start="true"
      @leave="leave"
    />
  </main>
</template>

<style scoped>
.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  margin: 0 auto;
  gap: 1.25rem;
}

.main-content {
  max-width: 40rem;
  width: 100%;
  margin: 0 auto;
}

.title {
  margin: 0;
  font-size: 1.65rem;
}

.lead {
  margin: 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  padding: 1.1rem 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.card-title {
  margin: 0;
  font-size: 1.05rem;
}

.card-body {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text);
}

.ok {
  color: var(--accent-dim);
  font-weight: 600;
}

.bad {
  color: #c97a7a;
  font-weight: 600;
}

.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}

.primary {
  align-self: flex-start;
  font: inherit;
  cursor: pointer;
  padding: 0.45rem 1rem;
  border-radius: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--accent) 55%, var(--border));
  background: color-mix(in srgb, var(--accent) 18%, var(--surface));
  color: var(--text-h);
}

.primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 28%, var(--surface));
}

.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
