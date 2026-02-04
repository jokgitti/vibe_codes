// =============================================================================
// MOOD DETECTION - Trend-based emotion mapping for moody_parkour
// =============================================================================

// Configuration
const MOOD_CONFIG = {
  SHORT_WINDOW_MS: 500, // ~500ms for "current" energy
  LONG_WINDOW_MS: 3000, // ~3s for "baseline" energy
  SAMPLE_INTERVAL: 33, // ~30fps, matches broadcast rate

  // Trend thresholds (as percentage change from baseline)
  RISING_THRESHOLD: 0.15, // +15% = rising
  FALLING_THRESHOLD: -0.15, // -15% = falling

  // Energy level thresholds (based on typical volume range 0-30)
  LOW_ENERGY: 4,
  MEDIUM_HIGH_ENERGY: 10, // Upper medium threshold
  HIGH_ENERGY: 16, // Only very high energy counts as "high"

  // Variance threshold for "erratic" detection (higher = harder to trigger)
  ERRATIC_VARIANCE: 100,
};

// Calculate samples needed for each window
const SHORT_WINDOW_SAMPLES = Math.ceil(
  MOOD_CONFIG.SHORT_WINDOW_MS / MOOD_CONFIG.SAMPLE_INTERVAL,
);
const LONG_WINDOW_SAMPLES = Math.ceil(
  MOOD_CONFIG.LONG_WINDOW_MS / MOOD_CONFIG.SAMPLE_INTERVAL,
);

// Energy history buffer (stores recent volume samples)
const energyHistory = [];

// Track the current mood state
let currentMood = {
  emotion: "happy",
  trend: "stable",
  energyLevel: "medium",
  confidence: 0,
};

/**
 * Record a new volume sample for mood tracking
 * Call this from the main loop at broadcast rate (~30fps)
 */
export function recordEnergySample(volume) {
  energyHistory.push(volume);

  // Keep only what we need for the long window
  if (energyHistory.length > LONG_WINDOW_SAMPLES) {
    energyHistory.shift();
  }

  // Update mood if we have enough samples
  if (energyHistory.length >= SHORT_WINDOW_SAMPLES) {
    updateMood();
  }
}

/**
 * Calculate average of an array slice
 */
function average(arr, start, end) {
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) {
    sum += arr[i];
  }
  return sum / (end - start);
}

/**
 * Calculate variance of an array slice
 */
function variance(arr, start, end) {
  const avg = average(arr, start, end);
  let sumSq = 0;
  for (let i = start; i < end; i++) {
    const diff = arr[i] - avg;
    sumSq += diff * diff;
  }
  return sumSq / (end - start);
}

/**
 * Update the current mood based on energy trends
 */
function updateMood() {
  const len = energyHistory.length;

  // Short window (recent)
  const shortStart = Math.max(0, len - SHORT_WINDOW_SAMPLES);
  const shortAvg = average(energyHistory, shortStart, len);
  const shortVariance = variance(energyHistory, shortStart, len);

  // Long window (baseline) - use all available history
  const longAvg = average(energyHistory, 0, len);

  // Calculate trend as percentage change from baseline
  const trend = longAvg > 0 ? (shortAvg - longAvg) / longAvg : 0;

  // Determine trend category
  let trendCategory;
  if (shortVariance > MOOD_CONFIG.ERRATIC_VARIANCE) {
    trendCategory = "erratic";
  } else if (trend > MOOD_CONFIG.RISING_THRESHOLD) {
    trendCategory = "rising";
  } else if (trend < MOOD_CONFIG.FALLING_THRESHOLD) {
    trendCategory = "falling";
  } else {
    trendCategory = "stable";
  }

  // Determine energy level (4 bands: low, medium, medium-high, high)
  let energyLevel;
  if (shortAvg < MOOD_CONFIG.LOW_ENERGY) {
    energyLevel = "low";
  } else if (shortAvg > MOOD_CONFIG.HIGH_ENERGY) {
    energyLevel = "high";
  } else if (shortAvg > MOOD_CONFIG.MEDIUM_HIGH_ENERGY) {
    energyLevel = "medium-high";
  } else {
    energyLevel = "medium";
  }

  // Map trend + energy to emotion
  const emotion = mapToEmotion(trendCategory, energyLevel);

  // Update current mood
  currentMood = {
    emotion,
    trend: trendCategory,
    energyLevel,
    confidence: Math.min(len / LONG_WINDOW_SAMPLES, 1), // Confidence grows as we collect more data
  };
}

/**
 * Map trend and energy level to an emotion
 * Energy levels: low, medium, medium-high, high
 *
 * Rare emotions (reserved for specific conditions):
 * - angry: only erratic + high
 * - confused: only erratic + medium-high
 * - surprised: only erratic + medium or low
 */
function mapToEmotion(trend, energy) {
  // Erratic = rare emotions (angry, confused, surprised)
  if (trend === "erratic") {
    if (energy === "high") return "angry"; // Chaotic high energy
    if (energy === "medium-high") return "confused"; // Chaotic medium-high
    return "surprised"; // Chaotic lower energy
  }

  // Rising trends
  if (trend === "rising") {
    if (energy === "high") return "excited"; // Peak energy building
    if (energy === "medium-high") return "happy"; // Good build-up
    if (energy === "medium") return "happy"; // Anticipation
    return "love"; // Warming up from quiet
  }

  // Falling trends
  if (trend === "falling") {
    if (energy === "high") return "excited"; // Still energetic on way down
    if (energy === "medium-high") return "happy"; // Gentle come-down
    if (energy === "medium") return "sad"; // Energy leaving
    return "sleepy"; // Fading to quiet
  }

  // Stable trends
  if (trend === "stable") {
    if (energy === "high") return "excited"; // Sustained high energy
    if (energy === "medium-high") return "happy"; // Good vibes
    if (energy === "medium") return "love"; // Steady warmth
    return "sleepy"; // Calm, quiet
  }

  // Fallback
  return "happy";
}

/**
 * Get the current detected emotion for moody_parkour
 */
export function getCurrentEmotion() {
  return currentMood.emotion;
}

/**
 * Get the full mood state (for debugging/UI)
 */
export function getMoodState() {
  return { ...currentMood };
}

/**
 * Reset mood tracking (e.g., when audio source changes)
 */
export function resetMood() {
  energyHistory.length = 0;
  currentMood = {
    emotion: "happy",
    trend: "stable",
    energyLevel: "medium",
    confidence: 0,
  };
}
