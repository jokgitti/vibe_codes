from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, HTMLResponse
import ascii_magic
from io import BytesIO
from PIL import Image

app = FastAPI(title="ASCII Art Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/convert", response_class=PlainTextResponse)
async def convert_to_ascii(
    file: UploadFile = File(...),
    columns: int = Query(default=80, ge=10, le=300),
    mode: str = Query(default="terminal", pattern="^(terminal|html)$"),
):
    """
    Convert an uploaded image to ASCII art.

    - **columns**: Width in characters (default 80)
    - **mode**: Output format - 'terminal' for plain text, 'html' for colored HTML
    """
    contents = await file.read()
    image = Image.open(BytesIO(contents))

    art = ascii_magic.from_pillow_image(image)

    if mode == "html":
        return HTMLResponse(content=art.to_html(columns=columns))

    return art.to_ascii(columns=columns, monochrome=True)


@app.post("/convert-url", response_class=PlainTextResponse)
async def convert_url_to_ascii(
    url: str = Query(...),
    columns: int = Query(default=80, ge=10, le=300),
    mode: str = Query(default="terminal", pattern="^(terminal|html)$"),
):
    """
    Convert an image from URL to ASCII art.
    """
    art = ascii_magic.from_url(url)

    if mode == "html":
        return HTMLResponse(content=art.to_html(columns=columns))

    return art.to_ascii(columns=columns, monochrome=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
