import { create } from 'zustand';
import { createRoadSlice, type RoadSlice } from './roadSlice';
import { createScenerySlice, type ScenerySlice } from './scenerySlice';
import { createScenarioSlice, type ScenarioSlice } from './scenarioSlice';
import { createPlaybackSlice, type PlaybackSlice } from './playbackSlice';

export type EditorStore = RoadSlice & ScenerySlice & ScenarioSlice & PlaybackSlice;

export const useEditorStore = create<EditorStore>()((...a) => ({
  ...createRoadSlice(...a),
  ...createScenerySlice(...a),
  ...createScenarioSlice(...a),
  ...createPlaybackSlice(...a),
}));

export type { RenderStatus } from './playbackSlice';
export { selectionActorId, selectionSceneryId } from './scenerySlice';
