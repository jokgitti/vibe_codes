// =============================================================================
// DRAW_ME GALLERY MANAGEMENT
// Pre-loads gallery data to calculate window sizes before opening
// =============================================================================

// Constants matching draw_me's canvas renderer
const DEFAULT_FONT_SIZE = 10;
const MIN_FONT_SIZE = 4;
const CHAR_WIDTH_RATIO = 0.6;

let galleryData = null;
let galleryLoaded = false;

/**
 * Load the draw_me gallery.json
 */
export async function loadDrawMeGallery() {
  if (galleryLoaded) return galleryData;

  try {
    const response = await fetch('../../draw_m3_like_one_of_your_ZnJlbmNoIGdpcmxz/gallery.json');
    if (!response.ok) throw new Error('gallery.json not found');

    galleryData = await response.json();
    galleryLoaded = true;
    console.log(`Loaded draw_me gallery: ${galleryData.images.length} images`);
    return galleryData;
  } catch (err) {
    console.error('Failed to load draw_me gallery:', err);
    return null;
  }
}

/**
 * Get a specific image or random image from the gallery
 */
export function getGalleryImage(imageId = 'random') {
  if (!galleryData || !galleryData.images || galleryData.images.length === 0) {
    return null;
  }

  if (imageId && imageId !== 'random') {
    const image = galleryData.images.find(img => img.id === imageId);
    if (image) return image;
    console.warn(`Image '${imageId}' not found, selecting random`);
  }

  // Random selection
  return galleryData.images[Math.floor(Math.random() * galleryData.images.length)];
}

/**
 * Get all image IDs for the asset selector
 */
export function getGalleryImageIds() {
  if (!galleryData || !galleryData.images) return [];
  return galleryData.images.map(img => img.id);
}

/**
 * Calculate font size to fit within constraints (same logic as draw_me)
 */
function calculateFontSize(columns, numLines, maxWidth, maxHeight) {
  const fontSizeByWidth = maxWidth / (columns * CHAR_WIDTH_RATIO);
  const fontSizeByHeight = maxHeight / numLines;
  return Math.max(MIN_FONT_SIZE, Math.min(DEFAULT_FONT_SIZE, Math.floor(Math.min(fontSizeByWidth, fontSizeByHeight))));
}

/**
 * Calculate the content dimensions for a draw_me window
 * Returns { width, height, imageId, imageData } or null if gallery not loaded
 * imageData contains the full image for passing to iframe
 */
export function calculateDrawMeDimensions(imageId, maxWidth, maxHeight) {
  const image = getGalleryImage(imageId);
  if (!image) return null;

  const columns = image.columns;
  // Check for animated (frames) vs static (lines)
  const isAnimated = Array.isArray(image.frames) && image.frames.length > 0;
  const firstFrame = isAnimated ? image.frames[0] : image.lines;
  const numLines = firstFrame.length;

  const fontSize = calculateFontSize(columns, numLines, maxWidth, maxHeight);
  const width = Math.ceil(columns * CHAR_WIDTH_RATIO * fontSize);
  const height = numLines * fontSize;

  return {
    width,
    height,
    imageId: image.id,
    columns,
    numLines,
    fontSize,
    // Include full image data for passing to iframe
    imageData: {
      id: image.id,
      columns: image.columns,
      lines: image.lines,
      frames: image.frames
    }
  };
}

/**
 * Check if gallery is loaded
 */
export function isGalleryLoaded() {
  return galleryLoaded;
}
