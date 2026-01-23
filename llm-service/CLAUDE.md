# LLM Service

A Node.js wrapper service for Ollama, providing chat generation for the tlkn_2_mslf project.

## Overview

- **Runtime**: Node.js with Express 5
- **LLM Backend**: Ollama (local)
- **Model**: Llama 3.2 3B (configurable)
- **Memory**: Limited to 512MB for Node process (Ollama manages its own memory)

## Prerequisites

1. **Install Ollama**: `brew install ollama`
2. **Start Ollama**: `ollama serve`

The service will automatically pull the model on first run if not present.

## Running

```bash
cd llm-service
npm install
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Configuration

Environment variables:
- `PORT` - Server port (default: 3001)
- `OLLAMA_URL` - Ollama API URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - Model to use (default: llama3.2:3b)

## API Endpoints

### GET /health

Check if the service and Ollama are running.

Response:
```json
{ "status": "ok", "model": "llama3.2:3b", "ollama": "http://localhost:11434" }
```

### GET /starter

Get a random conversation starter.

Response:
```json
{ "message": "what am i doing here" }
```

### POST /chat

Generate a response given a conversation history.

Request:
```json
{
  "messages": [
    { "role": "user", "content": "hello" },
    { "role": "assistant", "content": "hi there" }
  ]
}
```

Response:
```json
{ "message": "generated response here" }
```

### POST /monologue

Generate the next message in a self-conversation (for tlkn_2_mslf).

Request:
```json
{
  "history": [
    "what am i doing here",
    "maybe searching for something",
    "but what"
  ]
}
```

Response:
```json
{ "message": "perhaps the search is the point" }
```

## Chat Persona

The system prompt creates an introspective inner voice:
- Short, fragmented thoughts
- Stream-of-consciousness style
- Lowercase only, no ending punctuation
- Poetic but not pretentious
- Themes: existence, meaning, creativity, connection

## Architecture

```
┌─────────────┐              ┌──────────────┐              ┌────────┐
│ tlkn_2_mslf │ ──POST───►   │  llm-service │ ───HTTP───► │ Ollama │
└─────────────┘  :3001       │   (Node.js)  │   :11434    └────────┘
                             └──────────────┘
```

## Memory Management

- Node process: 512MB max (`--max-old-space-size=512`)
- Ollama: Manages its own memory based on model size
- Llama 3.2 3B: ~3GB RAM for inference

If Ollama runs out of memory, it will return an error. The service handles this gracefully and can retry.
