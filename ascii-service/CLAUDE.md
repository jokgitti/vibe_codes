# ASCII Art Service

A Python FastAPI service that converts images to ASCII art using ascii_magic.

## Overview

- **Runtime**: Python 3 with FastAPI
- **Library**: ascii_magic for image-to-ASCII conversion
- **Port**: 3002

## Prerequisites

Python 3.x installed on the system.

## Running

```bash
# One-time setup
make ascii-install

# Start the service
make ascii
```

Or manually:
```bash
cd ascii-service
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 3002
```

## Configuration

The service runs on port 3002 by default. Modify the uvicorn command in the Makefile to change.

## API Endpoints

### GET /health

Health check endpoint.

Response:
```json
{ "status": "ok" }
```

### POST /convert

Convert an uploaded image file to ASCII art.

Parameters (query string):
- `columns` - Width in characters (default: 80, range: 10-300)
- `mode` - Output format: `terminal` (plain text) or `html` (colored)

Request:
```bash
curl -X POST "http://localhost:3002/convert?columns=60" \
  -F "file=@image.jpg"
```

Response: Plain text ASCII art (or HTML if mode=html)

### POST /convert-url

Convert an image from URL to ASCII art.

Parameters (query string):
- `url` - Image URL (required)
- `columns` - Width in characters (default: 80, range: 10-300)
- `mode` - Output format: `terminal` (plain text) or `html` (colored)

Request:
```bash
curl -X POST "http://localhost:3002/convert-url?url=https://example.com/image.jpg&columns=60"
```

Response: Plain text ASCII art (or HTML if mode=html)

## JavaScript Usage

```javascript
// From URL
const res = await fetch('http://localhost:3002/convert-url?url=IMAGE_URL&columns=60', {
  method: 'POST'
});
const ascii = await res.text();

// From file upload
const formData = new FormData();
formData.append('file', fileInput.files[0]);
const res = await fetch('http://localhost:3002/convert?columns=60', {
  method: 'POST',
  body: formData
});
const ascii = await res.text();
```

## Output Modes

- **terminal**: Monochrome ASCII characters, suitable for terminal display
- **html**: Colored HTML output with ANSI colors preserved

## Architecture

```
┌────────────┐              ┌───────────────┐
│  JS App    │ ──POST───►   │ ascii-service │
└────────────┘   :3002      │   (FastAPI)   │
                            └───────────────┘
```

## Dependencies

- fastapi - Web framework
- uvicorn - ASGI server
- ascii_magic - Image to ASCII conversion
- pillow - Image processing
- python-multipart - File upload handling
