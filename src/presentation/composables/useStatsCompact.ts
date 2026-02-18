import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue';
import { useGameStateStore } from '../stores/gameState.js';

const STATS_COMPACT_ENTER = 70;
const STATS_COMPACT_LEAVE = 35;

/**
 * Scroll/resize-driven compact mode for the stats block (non-mine tabs).
 * When compact: section gets .stats--compact, spacer holds height, crew compact card visible.
 */
export function useStatsCompact(sectionRef: Ref<HTMLElement | null>) {
  const store = useGameStateStore();
  const compact = ref(false);
  const spacerStyle = ref<{ display: string; height?: string }>({ display: 'none' });

  let rafId: number | null = null;

  function updateCompact(): void {
    if (!sectionRef.value) return;
    const isMine = store.activeTab === 'mine';
    if (isMine) {
      compact.value = false;
      spacerStyle.value = { display: 'none' };
      return;
    }
    const y = window.scrollY;
    const wasCompact = compact.value;
    const nextCompact = wasCompact ? y > STATS_COMPACT_LEAVE : y > STATS_COMPACT_ENTER;
    if (nextCompact && !wasCompact && sectionRef.value) {
      spacerStyle.value = {
        display: 'block',
        height: `${sectionRef.value.offsetHeight}px`,
      };
    } else if (!nextCompact) {
      spacerStyle.value = { display: 'none' };
    }
    compact.value = nextCompact;
  }

  function onScroll(): void {
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      updateCompact();
    });
  }

  function onResize(): void {
    if (compact.value && sectionRef.value) {
      spacerStyle.value = {
        display: 'block',
        height: `${sectionRef.value.offsetHeight}px`,
      };
    }
  }

  watch(
    () => store.activeTab,
    () => {
      updateCompact();
    },
  );

  onMounted(() => {
    updateCompact();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    if (rafId != null) cancelAnimationFrame(rafId);
  });

  return { compact, spacerStyle };
}
