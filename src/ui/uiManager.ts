export type ViewName = 'idle' | 'starmap' | 'dungeon';
type ViewChangeCallback = (view: ViewName) => void;

export function createUIManager() {
  let currentView: ViewName = 'idle';
  const listeners: ViewChangeCallback[] = [];

  function showView(view: ViewName): void {
    if (view === currentView) return;
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${view}`)?.classList.add('active');
    currentView = view;
    listeners.forEach(cb => cb(view));
  }

  function onViewChange(cb: ViewChangeCallback): void {
    listeners.push(cb);
  }

  function getCurrentView(): ViewName {
    return currentView;
  }

  return { showView, onViewChange, getCurrentView };
}
