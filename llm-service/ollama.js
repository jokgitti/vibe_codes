// =============================================================================
// OLLAMA CLIENT
// =============================================================================

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

/**
 * Check if Ollama is running
 */
export async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check if the model is downloaded
 */
export async function isModelAvailable() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) return false;

    const data = await res.json();
    const models = data.models || [];
    return models.some(m => m.name === MODEL || m.name.startsWith(MODEL.split(':')[0]));
  } catch {
    return false;
  }
}

/**
 * Pull the model (downloads if not present)
 */
export async function pullModel() {
  console.log(`Pulling model: ${MODEL}...`);

  const res = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: MODEL })
  });

  if (!res.ok) {
    throw new Error(`Failed to pull model: ${res.statusText}`);
  }

  // Stream the response to show progress
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.status) {
          console.log(`  ${json.status}${json.completed ? ` (${json.completed}/${json.total})` : ''}`);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  console.log(`Model ${MODEL} ready.`);
}

/**
 * Generate a chat completion
 */
export async function chat(messages, options = {}) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.9,
        num_predict: options.maxTokens ?? 15,
        ...options
      }
    })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Ollama chat failed: ${error}`);
  }

  const data = await res.json();
  return data.message?.content || '';
}

/**
 * Ensure Ollama is running and model is available
 */
export async function ensureReady() {
  // Check if Ollama is running
  const ollamaRunning = await checkOllama();
  if (!ollamaRunning) {
    throw new Error('Ollama is not running. Start it with: ollama serve');
  }

  // Check if model is available, pull if not
  const modelReady = await isModelAvailable();
  if (!modelReady) {
    await pullModel();
  }

  return true;
}

export { MODEL, OLLAMA_BASE_URL };
