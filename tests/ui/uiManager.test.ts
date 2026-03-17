// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createUIManager } from '../../src/ui/uiManager.js';

// Mock DOM
beforeEach(() => {
  document.body.innerHTML = `
    <div id="view-idle" class="view active"></div>
    <div id="view-starmap" class="view"></div>
    <div id="view-dungeon" class="view"></div>
  `;
});

describe('UIManager', () => {
  it('switches views by hiding all and showing target', () => {
    const ui = createUIManager();
    ui.showView('starmap');

    expect(document.getElementById('view-idle')?.classList.contains('active')).toBe(false);
    expect(document.getElementById('view-starmap')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('view-dungeon')?.classList.contains('active')).toBe(false);
  });

  it('emits view-change event', () => {
    const ui = createUIManager();
    let changedTo = '';
    ui.onViewChange((view) => { changedTo = view; });
    ui.showView('dungeon');
    expect(changedTo).toBe('dungeon');
  });

  it('does not emit if switching to same view', () => {
    const ui = createUIManager();
    let count = 0;
    ui.onViewChange(() => { count++; });
    ui.showView('idle');
    expect(count).toBe(0);
  });
});
