#!/usr/bin/env python3
"""
CLI tool to convert images to ASCII art.

Usage:
    ./cli.py image.jpg
    ./cli.py image.png --columns 120
    ./cli.py image.jpg --mode html > output.html
    ./cli.py image.jpg --mode json --id portrait > art.json
"""
import argparse
import json
import os
import ascii_magic


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

    # Load image
    if args.url:
        art = ascii_magic.from_url(args.url)
        source = args.url
    else:
        art = ascii_magic.from_image(args.file)
        source = os.path.basename(args.file)

    # Convert and output
    if args.mode == "html":
        print(art.to_html(columns=args.columns))
    elif args.mode == "json":
        ascii_text = art.to_ascii(columns=args.columns, monochrome=True)
        lines = [line for line in ascii_text.split("\n") if line]

        # Determine ID
        image_id = args.id
        if not image_id:
            if args.file:
                image_id = os.path.splitext(os.path.basename(args.file))[0]
            else:
                image_id = "image"

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
            print(f"Added '{image_id}' to {args.append_to}")
        else:
            # Output single image JSON
            print(json.dumps(entry))
    else:
        print(art.to_ascii(columns=args.columns, monochrome=True))


if __name__ == "__main__":
    main()
