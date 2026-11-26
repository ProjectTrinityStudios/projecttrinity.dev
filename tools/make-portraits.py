#!/usr/bin/env python3
"""Web copies of the realistic portraits (Models 101) for Tooling 182.

Source: the game repository's art/portraits/ (portrait-<id>-4x5.png 1600x2000 cut-out, portrait-<id>-16x9.png 3840x2160).
Writes, under img/portraits/:
  <id>-480.webp, <id>-800.webp   the 4:5 cut-out, alpha kept (the render sticker)
  <id>-16x9-800.jpg, -1280.jpg   the 16:9 in its room (the render banner)
  share-<id>.jpg                 1200x630 link card cut from the 16:9
Usage: python tools/make-portraits.py <path to art/portraits>
"""
import sys
from pathlib import Path
from PIL import Image

IDS = ["bastion", "oracle", "reaver", "asha", "patchwork", "giant", "old-hunger", "maera"]
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "img" / "portraits"


def main(src: Path):
    OUT.mkdir(parents=True, exist_ok=True)
    for pid in IDS:
        card = Image.open(src / f"portrait-{pid}-4x5.png").convert("RGBA")
        for w in (480, 800):
            card.resize((w, w * 5 // 4), Image.LANCZOS).save(OUT / f"{pid}-{w}.webp", quality=84, method=6)
        wide = Image.open(src / f"portrait-{pid}-16x9.png").convert("RGB")
        for w in (800, 1280):
            wide.resize((w, w * 9 // 16), Image.LANCZOS).save(OUT / f"{pid}-16x9-{w}.jpg", quality=84, optimize=True, progressive=True)
        # the link card: 1200 wide, cut to 630 tall, keeping the eyes' line (0.36 of the height) in view
        big = wide.resize((1200, 675), Image.LANCZOS)
        top = max(0, min(675 - 630, int(675 * 0.36 - 630 * 0.4)))
        big.crop((0, top, 1200, top + 630)).save(OUT / f"share-{pid}.jpg", quality=84, optimize=True, progressive=True)
        print("wrote", pid)


if __name__ == "__main__":
    main(Path(sys.argv[1]))
