// =============================================================================
// TITLE ANIMATION (lucid_dream style)
// =============================================================================

const TITLE_WORD = 'orchestrator';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const SHUFFLE_INTERVAL = 50; // ms between letter changes
const REVEAL_DELAY = 2000; // 2 seconds before first letter reveals
const LETTER_REVEAL_INTERVAL = 150; // ms between each letter reveal
const SUBTITLE_FADE_DELAY = 500; // ms after last letter before subtitle fades in

let titleLetters, subtitle;
let titleLetterEls = [];
let titleRevealedCount = 0;
let titleShuffleInterval = null;

export function initTitleElements() {
  titleLetters = document.getElementById('titleLetters');
  subtitle = document.getElementById('subtitle');
}

export function initTitleAnimation() {
  if (!titleLetters) return;

  // Create letter elements
  titleLetters.innerHTML = '';
  titleLetterEls = [];
  titleRevealedCount = 0;

  for (let i = 0; i < TITLE_WORD.length; i++) {
    const letterEl = document.createElement('span');
    letterEl.className = 'title-letter';
    letterEl.textContent = ALPHABET[Math.floor(Math.random() * 26)];
    titleLetters.appendChild(letterEl);
    titleLetterEls.push({
      element: letterEl,
      targetLetter: TITLE_WORD[i],
      revealed: false
    });
  }

  // Reset subtitle
  subtitle.classList.remove('visible', 'pulsing');

  // Start shuffling
  titleShuffleInterval = setInterval(shuffleTitleLetters, SHUFFLE_INTERVAL);

  // Start reveal sequence after delay
  setTimeout(startTitleReveal, REVEAL_DELAY);
}

function shuffleTitleLetters() {
  titleLetterEls.forEach(letter => {
    if (!letter.revealed) {
      letter.element.textContent = ALPHABET[Math.floor(Math.random() * 26)];
    }
  });
}

function startTitleReveal() {
  revealNextLetter();
}

function revealNextLetter() {
  if (titleRevealedCount >= titleLetterEls.length) {
    // All letters revealed, stop shuffling and show subtitle
    clearInterval(titleShuffleInterval);
    titleShuffleInterval = null;
    setTimeout(showSubtitle, SUBTITLE_FADE_DELAY);
    return;
  }

  const letter = titleLetterEls[titleRevealedCount];
  letter.revealed = true;
  letter.element.textContent = letter.targetLetter;
  letter.element.classList.add('revealed');
  titleRevealedCount++;

  setTimeout(revealNextLetter, LETTER_REVEAL_INTERVAL);
}

function showSubtitle() {
  subtitle.classList.add('visible');
  // Start pulsing after fade-in completes
  setTimeout(() => {
    subtitle.classList.add('pulsing');
  }, 500);
}

export function stopTitleAnimation() {
  if (titleShuffleInterval) {
    clearInterval(titleShuffleInterval);
    titleShuffleInterval = null;
  }
}
