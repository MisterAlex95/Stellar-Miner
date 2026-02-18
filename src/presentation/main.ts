/**
 * Vue app bootstrap. Mounted from game.ts before legacy mount runs.
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { setPinia } from './piniaInstance.js';
import App from './App.vue';

export function mountVueApp(): void {
  const appEl = document.getElementById('app');
  if (!appEl) return;
  const pinia = createPinia();
  setPinia(pinia);
  const app = createApp(App);
  app.use(pinia);
  app.mount(appEl);
}
