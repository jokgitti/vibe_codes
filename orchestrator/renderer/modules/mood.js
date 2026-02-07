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

  // Percentage of samples that must exceed ERRATIC_VARIANCE to trigger erratic mood
  ERRATIC_SUSTAINED_RATIO: 0.5, // 50% of samples must be high variance

  // Minimum time between mood changes (prevents rapid oscillation)
  MOOD_CHANGE_COOLDOWN_MS: 1000,
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

// Buffer for mood window averaging (stores trend and energy samples during cooldown)
const moodWindowBuffer = {
  trends: [], // Raw trend percentages
  energies: [], // Raw shortAvg values
  variances: [], // Raw variance values
};

// Track the current mood state
let currentMood = {
  emotion: "happy",
  trend: "stable",
  energyLevel: "medium",
  confidence: 0,
};

// Track when emotion last changed (for throttling)
let lastEmotionChangeTime = 0;

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

  // Buffer samples for averaging over the mood window
  moodWindowBuffer.trends.push(trend);
  moodWindowBuffer.energies.push(shortAvg);
  moodWindowBuffer.variances.push(shortVariance);

  // Check if cooldown has passed
  const now = performance.now();
  const timeSinceLastChange = now - lastEmotionChangeTime;
  const canChangeEmotion =
    timeSinceLastChange >= MOOD_CONFIG.MOOD_CHANGE_COOLDOWN_MS;

  let emotion = currentMood.emotion;
  let trendCategory = currentMood.trend;
  let energyLevel = currentMood.energyLevel;

  if (canChangeEmotion && moodWindowBuffer.trends.length > 0) {
    // Average the buffered values over the mood window
    const avgTrend = simpleAverage(moodWindowBuffer.trends);
    const avgEnergy = simpleAverage(moodWindowBuffer.energies);

    // Count how many samples had high variance (sustained erratic detection)
    const highVarianceCount = countAboveThreshold(
      moodWindowBuffer.variances,
      MOOD_CONFIG.ERRATIC_VARIANCE,
    );
    const highVarianceRatio =
      highVarianceCount / moodWindowBuffer.variances.length;

    // Determine trend category from averaged values
    if (highVarianceRatio >= MOOD_CONFIG.ERRATIC_SUSTAINED_RATIO) {
      trendCategory = "erratic";
    } else if (avgTrend > MOOD_CONFIG.RISING_THRESHOLD) {
      trendCategory = "rising";
    } else if (avgTrend < MOOD_CONFIG.FALLING_THRESHOLD) {
      trendCategory = "falling";
    } else {
      trendCategory = "stable";
    }

    // Determine energy level from averaged values
    if (avgEnergy < MOOD_CONFIG.LOW_ENERGY) {
      energyLevel = "low";
    } else if (avgEnergy > MOOD_CONFIG.HIGH_ENERGY) {
      energyLevel = "high";
    } else if (avgEnergy > MOOD_CONFIG.MEDIUM_HIGH_ENERGY) {
      energyLevel = "medium-high";
    } else {
      energyLevel = "medium";
    }

    // Map averaged trend + energy to emotion
    const newEmotion = mapToEmotion(trendCategory, energyLevel);

    // Update emotion if different
    if (newEmotion !== currentMood.emotion) {
      emotion = newEmotion;
      lastEmotionChangeTime = now;
      console.log(
        `[mood] ${emotion} (trend: ${trendCategory}, energy: ${energyLevel}, erratic: ${(highVarianceRatio * 100).toFixed(0)}%)`,
      );
    }

    // Clear buffer for next window
    moodWindowBuffer.trends.length = 0;
    moodWindowBuffer.energies.length = 0;
    moodWindowBuffer.variances.length = 0;
  }

  // Update current mood
  currentMood = {
    emotion,
    trend: trendCategory,
    energyLevel,
    confidence: Math.min(len / LONG_WINDOW_SAMPLES, 1),
  };
}

/**
 * Simple average of an array
 */
function simpleAverage(arr) {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum / arr.length;
}

/**
 * Count how many values in array exceed threshold
 */
function countAboveThreshold(arr, threshold) {
  let count = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > threshold) count++;
  }
  return count;
}

/**
 * Map trend and energy level to an emotion
 * Energy levels: low, medium, medium-high, high
 *
 * Rare emotions (reserved for erratic conditions):
 * - confused: erratic + medium-high
 * - surprised: erratic + medium or low
 */
function mapToEmotion(trend, energy) {
  // Erratic = rare emotions (confused, surprised) or excited for high energy
  if (trend === "erratic") {
    if (energy === "high") return "excited"; // Chaotic high energy (e.g. heavy drops)
    if (energy === "medium-high") return "confused";
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
  moodWindowBuffer.trends.length = 0;
  moodWindowBuffer.energies.length = 0;
  moodWindowBuffer.variances.length = 0;
  currentMood = {
    emotion: "happy",
    trend: "stable",
    energyLevel: "medium",
    confidence: 0,
  };
  lastEmotionChangeTime = 0;
}
