// =============================================================================
// LLM SERVICE - Express wrapper for Ollama
// =============================================================================

import express from 'express';
import { chat, ensureReady, MODEL, OLLAMA_BASE_URL } from './ollama.js';
import { SYSTEM_PROMPT, getRandomStarter } from './prompts.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * Health check
 */
app.get('/health', async (req, res) => {
  try {
    await ensureReady();
    res.json({ status: 'ok', model: MODEL, ollama: OLLAMA_BASE_URL });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

/**
 * Generate a chat response
 * Body: { messages: [{ role: 'user'|'assistant', content: string }] }
 */
app.post('/chat', async (req, res) => {
  try {
    const { messages = [] } = req.body;

    // Build conversation with system prompt
    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    const response = await chat(conversation);

    // Ensure lowercase (sometimes models don't follow instructions perfectly)
    const cleanedResponse = response.toLowerCase().replace(/[.!?]$/, '');

    res.json({ message: cleanedResponse });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get a random conversation starter
 */
app.get('/starter', (req, res) => {
  res.json({ message: getRandomStarter() });
});

/**
 * Generate next message in self-conversation
 * This endpoint maintains context and generates both sides of the dialogue
 */
app.post('/monologue', async (req, res) => {
  try {
    const { history = [] } = req.body;

    // If no history, start with a random starter
    if (history.length === 0) {
      return res.json({ message: getRandomStarter() });
    }

    // Build as a continuous stream of consciousness
    const recentHistory = history.slice(-10).join('\n');

    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `continue this inner monologue:\n\n${recentHistory}` }
    ];

    const response = await chat(conversation);

    const cleanedResponse = response.trim().toLowerCase().replace(/[.!?]$/, '');

    // Ensure we always return something
    const finalMessage = cleanedResponse || 'the words escape me';
    res.json({ message: finalMessage });
  } catch (err) {
    console.error('Monologue error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// STARTUP
// =============================================================================

async function start() {
  console.log('LLM Service starting...');
  console.log(`Ollama URL: ${OLLAMA_BASE_URL}`);
  console.log(`Model: ${MODEL}`);

  try {
    await ensureReady();
    console.log('Ollama ready.');
  } catch (err) {
    console.error(`Warning: ${err.message}`);
    console.log('Service will start anyway - Ollama may become available later.');
  }

  app.listen(PORT, () => {
    console.log(`LLM Service running on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  GET  /health   - Check service status');
    console.log('  GET  /starter  - Get random conversation starter');
    console.log('  POST /chat     - Generate chat response');
    console.log('  POST /monologue - Generate next monologue message');
  });
}

start();
