# ASCII Art CLI

A Python CLI tool that converts images to ASCII art using ascii_magic.

## Overview

- **Runtime**: Python 3
- **Library**: ascii_magic for image-to-ASCII conversion

## Prerequisites

Python 3.x installed on the system.

## Setup

```bash
cd ascii-service
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

## CLI Usage

```bash
# Basic conversion (outputs to terminal)
./venv/bin/python cli.py image.jpg

# Specify columns
./venv/bin/python cli.py image.png --columns 160

# Output as HTML
./venv/bin/python cli.py image.jpg --mode html > output.html

# Output as JSON (for gallery.json)
./venv/bin/python cli.py image.jpg --mode json --id myimage

# Append to existing gallery
./venv/bin/python cli.py image.jpg --mode json --id myimage -c 160 --append-to ../project/gallery.json

# From URL
./venv/bin/python cli.py --url https://example.com/image.jpg
```

## Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--columns` | `-c` | 80 | Width in characters |
| `--mode` | `-m` | terminal | Output: `terminal`, `html`, or `json` |
| `--id` | | filename | Identifier for JSON output |
| `--append-to` | `-a` | | Append to existing JSON gallery file |
| `--url` | | | Load image from URL instead of file |

## JSON Output Format

Single image:
```json
{
  "id": "myimage",
  "source": "image.jpg",
  "columns": 160,
  "lines": ["line1", "line2", ...]
}
```

Gallery format (when using `--append-to`):
```json
{
  "images": [
    { "id": "img1", "source": "...", "columns": 160, "lines": [...] },
    { "id": "img2", "source": "...", "columns": 120, "lines": [...] }
  ]
}
```

## Dependencies

- ascii_magic - Image to ASCII conversion
- pillow - Image processing
