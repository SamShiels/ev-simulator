import { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

export function useEditorKeyBindings() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const { selectedWaypointId, selectedActorId, deleteWaypoint } = useEditorStore.getState();
      if (selectedWaypointId) {
        deleteWaypoint(selectedActorId, selectedWaypointId);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
