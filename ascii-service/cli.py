#!/usr/bin/env python3
"""
CLI tool to convert images to ASCII art.

Usage:
    ./cli.py image.jpg
    ./cli.py image.png --columns 120
    ./cli.py image.jpg --mode html > output.html
    ./cli.py image.jpg --mode json --id portrait > art.json
    ./cli.py animation.gif --mode json --id anim  # extracts all frames
"""
import argparse
import json
import os
import ascii_magic
from PIL import Image


def is_animated_gif(filepath):
    """Check if file is an animated GIF with multiple frames."""
    try:
        with Image.open(filepath) as img:
            return img.format == "GIF" and getattr(img, "n_frames", 1) > 1
    except Exception:
        return False


def extract_gif_frames(filepath, columns):
    """Extract all frames from a GIF and convert each to ASCII."""
    frames = []
    with Image.open(filepath) as img:
        n_frames = img.n_frames
        print(f"Extracting {n_frames} frames...", file=__import__("sys").stderr)

        for i in range(n_frames):
            img.seek(i)
            # Convert to RGB (GIF frames may be palette mode)
            frame = img.convert("RGB")
            art = ascii_magic.from_pillow_image(frame)
            ascii_text = art.to_ascii(columns=columns, monochrome=True)
            lines = [line for line in ascii_text.split("\n") if line]
            frames.append(lines)

    return frames


def main():
    parser = argparse.ArgumentParser(
        description="Convert images to ASCII art",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s photo.jpg
    %(prog)s photo.png --columns 120
    %(prog)s photo.jpg --mode html > output.html
    %(prog)s photo.jpg --mode json --id portrait
    %(prog)s photo.jpg --mode json --id portrait --append-to gallery.json
    %(prog)s animation.gif --mode json --id anim  # extracts all GIF frames
    %(prog)s --url https://example.com/image.jpg
        """,
    )
    parser.add_argument("file", nargs="?", help="Path to image file")
    parser.add_argument("--url", help="Image URL (alternative to file)")
    parser.add_argument(
        "--columns", "-c", type=int, default=80, help="Width in characters (default: 80)"
    )
    parser.add_argument(
        "--mode",
        "-m",
        choices=["terminal", "html", "json"],
        default="terminal",
        help="Output mode (default: terminal)",
    )
    parser.add_argument(
        "--id",
        help="Identifier for the image (used in json mode, defaults to filename)",
    )
    parser.add_argument(
        "--append-to",
        "-a",
        help="Append to existing JSON file instead of creating new output",
    )

    args = parser.parse_args()

    if not args.file and not args.url:
        parser.error("Either FILE or --url is required")

    if args.file and args.url:
        parser.error("Cannot specify both FILE and --url")

    # Check if input is an animated GIF
    is_gif = args.file and is_animated_gif(args.file)

    # Load image
    if args.url:
        art = ascii_magic.from_url(args.url)
        source = args.url
    elif is_gif:
        source = os.path.basename(args.file)
        # GIF handling is done separately for JSON mode
    else:
        art = ascii_magic.from_image(args.file)
        source = os.path.basename(args.file)

    # Convert and output
    if args.mode == "html":
        if is_gif:
            parser.error("HTML mode not supported for animated GIFs")
        print(art.to_html(columns=args.columns))
    elif args.mode == "json":
        # Determine ID
        image_id = args.id
        if not image_id:
            if args.file:
                image_id = os.path.splitext(os.path.basename(args.file))[0]
            else:
                image_id = "image"

        if is_gif:
            # Extract all GIF frames
            frames = extract_gif_frames(args.file, args.columns)
            entry = {
                "id": image_id,
                "source": source,
                "columns": args.columns,
                "frames": frames,
            }
        else:
            ascii_text = art.to_ascii(columns=args.columns, monochrome=True)
            lines = [line for line in ascii_text.split("\n") if line]
            entry = {
                "id": image_id,
                "source": source,
                "columns": args.columns,
                "lines": lines,
            }

        if args.append_to:
            # Load existing file or create new structure
            if os.path.exists(args.append_to):
                with open(args.append_to, "r") as f:
                    data = json.load(f)
            else:
                data = {"images": []}

            # Replace existing entry with same ID or append
            existing_ids = {img["id"]: i for i, img in enumerate(data["images"])}
            if image_id in existing_ids:
                data["images"][existing_ids[image_id]] = entry
            else:
                data["images"].append(entry)

            with open(args.append_to, "w") as f:
                json.dump(data, f)
            print(f"Added '{image_id}' ({len(entry.get('frames', [entry.get('lines', [])]))} frame(s)) to {args.append_to}")
        else:
            # Output single image JSON
            print(json.dumps(entry))
    else:
        if is_gif:
            # For terminal mode, just show first frame
            frames = extract_gif_frames(args.file, args.columns)
            print("\n".join(frames[0]))
        else:
            print(art.to_ascii(columns=args.columns, monochrome=True))


if __name__ == "__main__":
    main()
