// =============================================================================
// SHARED STATE (using object for easy mutation access across modules)
// =============================================================================

import { PROJECTS } from './config.js';

// Initialize project counts
const projectCounts = {};
PROJECTS.forEach(p => projectCounts[p] = 0);

// Single state object that all modules can mutate
export const state = {
  // Audio
  audioContext: null,
  analyser: null,
  micSource: null,
  frequencyData: null,
  timeDomainData: null,
  audioEnabled: false,
  volumeHistory: [],
  lastBeatTime: 0,
  lastCloseTime: 0,
  lastBroadcastTime: 0,

  // Sensitivity
  sensitivity: 1.0,

  // Windows
  virtualWindows: [], // { id, element, iframe, project, gridIndex }
  windowIdCounter: 0,
  projectCounts,

  // Pattern
  currentPattern: 'random',

  // Auto-open mode (toggled with Cmd+S)
  autoOpenEnabled: false,

  // Grid state (for grid pattern)
  gridCells: [],
  gridCols: 0,
  gridRows: 0,

  // Z-index management for dragging
  currentZIndex: 1,

  // BPM calculation (stores recent beat timestamps)
  beatTimestamps: [],

  // Onset detection history
  onsetHistory: [],

  // Pending beat flag (persists until broadcast)
  pendingBeat: false
};
