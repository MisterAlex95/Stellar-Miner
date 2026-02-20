import { describe, it, expect, beforeEach, vi } from 'vitest';
import { tryShowNarrator } from './narrator.js';

const mockShowToast = vi.fn();
const mockGetNarratorShown = vi.fn();
const mockAddNarratorShown = vi.fn();

vi.mock('./gameState.js', () => ({
  getNarratorShown: () => mockGetNarratorShown(),
  addNarratorShown: (id: string) => mockAddNarratorShown(id),
}));
vi.mock('./uiBridge.js', () => ({
  getPresentationPort: () => ({ showToast: mockShowToast }),
}));

describe('narrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNarratorShown.mockReturnValue([]);
  });

  it('shows toast and marks trigger when trigger not yet shown', () => {
    tryShowNarrator('coins_1m');

    expect(mockGetNarratorShown).toHaveBeenCalled();
    expect(mockAddNarratorShown).toHaveBeenCalledWith('coins_1m');
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      'Mission control: First million in the vault. The belt is taking notice.',
      'milestone',
      { duration: 4000 }
    );
  });

  it('does not show toast when trigger already in narratorShown', () => {
    mockGetNarratorShown.mockReturnValue(['coins_1m']);

    tryShowNarrator('coins_1m');

    expect(mockAddNarratorShown).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does nothing for unknown trigger', () => {
    tryShowNarrator('unknown_trigger');

    expect(mockAddNarratorShown).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('does nothing for non-string trigger', () => {
    tryShowNarrator('');

    expect(mockAddNarratorShown).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows first discovery narratives when trigger not yet shown', () => {
    tryShowNarrator('first_negative_event');
    expect(mockAddNarratorShown).toHaveBeenCalledWith('first_negative_event');
    expect(mockShowToast).toHaveBeenCalledWith(
      'Ship log: First negative anomaly. The belt does not always reward.',
      'milestone',
      { duration: 4000 }
    );

    mockGetNarratorShown.mockReturnValue([]);
    tryShowNarrator('first_gas_giant');
    expect(mockAddNarratorShown).toHaveBeenCalledWith('first_gas_giant');
    expect(mockShowToast).toHaveBeenCalledWith(
      'Mission control: First gas giant charted. The fleet has reached the giants.',
      'milestone',
      { duration: 4000 }
    );

    mockGetNarratorShown.mockReturnValue([]);
    tryShowNarrator('first_lost_expedition');
    expect(mockAddNarratorShown).toHaveBeenCalledWith('first_lost_expedition');
    expect(mockShowToast).toHaveBeenCalledWith(
      'Comms: Expedition lost. The void takes its due. Honour them.',
      'milestone',
      { duration: 4000 }
    );
  });
});
