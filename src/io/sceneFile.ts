import { useEditorStore } from '../store/useEditorStore';
import type { GridCell, SceneryItem } from '../App';
import type { Scenario } from '../scenario/types';

export interface SceneFile {
  version: 1;
  roadGrid: GridCell[][];
  sceneryItems: SceneryItem[];
  scenario: Scenario;
  simulationPrompt: string;
}

export function saveScene(): void {
  const { roadGrid, sceneryItems, scenario, simulationPrompt } = useEditorStore.getState();
  const data: SceneFile = { version: 1, roadGrid, sceneryItems, scenario, simulationPrompt };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scene-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadScene(file: File): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string) as SceneFile;
      if (data.version !== 1) {
        console.error('Unsupported scene file version:', data.version);
        return;
      }
      useEditorStore.setState({
        roadGrid: data.roadGrid,
        sceneryItems: data.sceneryItems,
        scenario: data.scenario,
        simulationPrompt: data.simulationPrompt,
        selection: { kind: 'actor', id: 'ego' },
        drawingPath: false,
        selectedWaypointId: null,
        selectedWaypointActorId: null,
        waypointPopupPos: null,
        scenarioProgress: 0,
        playing: false,
        renderPass: 'idle',
        renderStatus: 'idle',
      });
    } catch (err) {
      console.error('Failed to load scene file:', err);
    }
  };
  reader.readAsText(file);
}
