// =============================================================================
// CONFIGURATION
// =============================================================================

export const CONFIG = {
  // Window sizing
  WINDOW_WIDTH: 400,
  WINDOW_HEIGHT: 400,
  WINDOW_GAP: 10,
  TITLEBAR_HEIGHT: 18,
  CHROME_PADDING: 8, // borders + margins

  // Limits
  MAX_WINDOWS: 35,
  MAX_PER_PROJECT: 7, // Default max per project
  PROJECT_LIMITS: {
    'draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz': 5 // Heavy to render
  },

  // Audio
  FFT_SIZE: 512,
  SAMPLE_RATE: 44100,
  VOLUME_HISTORY_SIZE: 30,

  // Beat detection (base values, adjusted by sensitivity)
  // Time-domain volume typically ranges 0-30
  BEAT_THRESHOLD_BASE: 1.3,
  BEAT_COOLDOWN: 300,
  MIN_VOLUME_BASE: 2,

  // Onset detection - detects sudden increases in volume
  // ONSET_THRESHOLD: minimum volume increase to trigger (adjusted by sensitivity)
  // ONSET_HISTORY: frames to compare against (shorter = more reactive)
  ONSET_THRESHOLD_BASE: 8,
  ONSET_HISTORY: 3,

  // Close detection
  CLOSE_COOLDOWN: 800,
  MIN_WINDOWS_TO_CLOSE: 3,

  // Audio broadcast (30fps = 33ms interval)
  BROADCAST_INTERVAL: 33,

  // BPM calculation
  BPM_HISTORY_SIZE: 8,      // Number of beats to average
  BPM_MAX_INTERVAL: 2000    // Ignore gaps > 2 seconds as "pauses"
};

// Available projects
export const PROJECTS = [
  'draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz',
  'circling_cycle',
  'lucid_dream',
  'pitchy_soundwave',
  'rotating_gliph',
  'tlkn_2_mslf'
];
