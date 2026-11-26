#!/usr/bin/env python3
"""The Book's paper and sky, sharp on a large screen and when zoomed (his note, 2026-11-25: "up the quality to like 4K").

- img/book/paper-day.webp, paper-night.webp: a seamless 2048 px tile (drawn at 1024 CSS px, so twice the density of the
  screen), in the colours and grain of the game's own paper plates (unity-b/Assets/UI/Art/Book/Paper/paper-*.jpg, 720 px,
  which the site used to stretch over every card). Band-limited noise made in the frequency domain is periodic, so the
  tile has no seam: a soft mottle, a fine crinkle in relief, and grain.
- img/book/sky-day-3840.webp, sky-day-1920.webp: the game's painted sky (img/book/sky-day.jpg, 1536 px, the only source)
  drawn up to 4K with a fine grain, its lilac veil and its fade to clear built in, so the page's sky melts into the
  colour beneath at any screen width (the fixed-height veil over it made the hard lilac band on wide screens).

Usage: python tools/make-textures.py   (needs Pillow and numpy)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BOOK = ROOT / "img" / "book"
N = 2048


def periodic(rng, lo, hi):
    """Unit-variance noise holding frequencies between lo and hi cycles per tile (hi None: everything below lo)."""
    f = np.fft.fft2(rng.standard_normal((N, N)))
    fy = np.fft.fftfreq(N)[:, None] * N
    fx = np.fft.fftfreq(N)[None, :] * N
    r = np.sqrt(fx * fx + fy * fy)
    mask = np.exp(-(r / hi) ** 2) - (np.exp(-(r / lo) ** 2) if lo else 0)
    out = np.real(np.fft.ifft2(f * mask))
    return (out - out.mean()) / out.std()


def paper(name, mean, spread, seed):
    rng = np.random.default_rng(seed)
    mottle = periodic(rng, 0, 7)
    crinkle = periodic(rng, 50, 140)
    relief = np.roll(crinkle, 1, axis=1) - crinkle + np.roll(crinkle, 1, axis=0) - crinkle  # light from the top left
    relief = relief / relief.std()
    grain = periodic(rng, 300, 900)
    warm = periodic(rng, 0, 4)
    lum = 0.5 * mottle + 0.8 * relief + 0.45 * grain
    lum = lum / lum.std()
    img = np.empty((N, N, 3))
    for c in range(3):
        img[..., c] = mean[c] + spread[c] * lum
    img[..., 2] -= 0.6 * spread[2] * warm  # the day paper yellows in soft patches, as the plate does
    img[..., 1] -= 0.25 * spread[1] * warm
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(BOOK / f"{name}.webp", quality=82, method=6)
    print("wrote", name)


def sky():
    src = Image.open(BOOK / "sky-day.jpg").convert("RGB")
    src = src.filter(ImageFilter.GaussianBlur(0.6))  # soften the JPEG's blocks before drawing it up
    for w in (3840, 1920):
        h = w * 9 // 16
        big = np.asarray(src.resize((w, h), Image.LANCZOS)).astype(float)
        veil = np.array([195, 179, 234], float)  # --sky-top: the 25 percent lilac veil the page laid over it
        big = big * 0.75 + veil * 0.25
        rng = np.random.default_rng(7)
        big += rng.normal(0, 2.2, (h, w, 1))
        y = np.linspace(0, 1, h)[:, None]
        t = np.clip((y - 0.45) / 0.55, 0, 1)
        alpha = 1 - t * t * (3 - 2 * t)  # clear by the foot, smoothly
        rgba = np.dstack([np.clip(big, 0, 255), (alpha * 255)[..., None].repeat(w, 1)]).astype(np.uint8)
        Image.fromarray(rgba, "RGBA").save(BOOK / f"sky-day-{w}.webp", quality=74, method=6)
        print("wrote sky", w)


if __name__ == "__main__":
    paper("paper-day", (252.9, 232.9, 212.4), (2.6, 4.0, 6.0), 11)
    paper("paper-night", (25.7, 36.3, 89.5), (4.2, 4.4, 5.8), 12)
    sky()
