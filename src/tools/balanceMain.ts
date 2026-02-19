/**
 * Standalone balance tool entry. Open balance.html (or /balance.html in dev) to edit game data visually.
 */
import '../styles/index.css';
import { createApp } from 'vue';
import BalanceToolApp from '../presentation/balanceTool/BalanceToolApp.vue';

const appEl = document.getElementById('app');
if (appEl) {
  appEl.classList.add('balance-tool-host');
  createApp(BalanceToolApp).mount(appEl);
}
