<script setup lang="ts">
import Main from './components/Main.vue'
</script>

<template>
  <div class="app-root">
    <Main style="z-index: 1000;" />
    <footer class="dev-contact-badge" style="z-index: 900;">
      <span class="dev-contact-label">Developer contact</span>
      <a class="dev-contact-mail" href="mailto:hurski.free@gmail.com">hurski.free@gmail.com</a>
    </footer>
  </div>
</template>

<style scoped>
/* Lobby / room UI (shared across components) */
.app-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 0.5rem;
  box-sizing: border-box;
  gap: 1rem;
}

.dev-contact-badge {
  position: fixed;
  bottom: 0.75rem;
  left: 0.75rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  z-index: 10;
  pointer-events: none;
}

.dev-contact-label {
  text-transform: uppercase;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: var(--muted);
  opacity: 0.42;
}

.dev-contact-mail {
  pointer-events: auto;
  color: var(--text);
  text-decoration: none;
  opacity: 0.4;
  border-bottom: 1px solid transparent;
}

.dev-contact-mail:hover {
  opacity: 0.92;
  color: var(--accent-dim);
  border-bottom-color: color-mix(in srgb, var(--accent-dim) 45%, transparent);
}
</style>
