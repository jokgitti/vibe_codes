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
  MAX_PER_PROJECT: 7,

  // Audio
  FFT_SIZE: 512,
  SAMPLE_RATE: 44100,
  VOLUME_HISTORY_SIZE: 30,

  // Beat detection (base values, adjusted by sensitivity)
  // Time-domain volume typically ranges 0-30
  BEAT_THRESHOLD_BASE: 1.3,
  BEAT_COOLDOWN: 300,
  MIN_VOLUME_BASE: 2,

  // Close detection
  CLOSE_COOLDOWN: 800,
  MIN_WINDOWS_TO_CLOSE: 3,

  // Audio broadcast (30fps = 33ms interval)
  BROADCAST_INTERVAL: 33
};

// Available projects
export const PROJECTS = [
  'circling_cycle',
  'lucid_dream',
  'pitchy_soundwave',
  'rotating_gliph',
  'tlkn_2_mslf'
];
