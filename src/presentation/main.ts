/**
 * Vue app bootstrap. Mounted from game.ts at init.
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { setPinia } from './piniaInstance.js';
import { i18n } from '../application/i18n.js';
import App from './App.vue';
import DataToolApp from './DataToolApp.vue';

export function mountVueApp(): void {
  const appEl = document.getElementById('app');
  if (!appEl) return;
  const pinia = createPinia();
  setPinia(pinia);
  const app = createApp(App);
  app.use(pinia);
  app.use(i18n);
  app.mount(appEl);
}

/** Mount the dev data tool (used when ?tool=data). No game init. */
export function mountDataToolApp(): void {
  const appEl = document.getElementById('app');
  if (!appEl) return;
  const app = createApp(DataToolApp);
  app.mount(appEl);
}
