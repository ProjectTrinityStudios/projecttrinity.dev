#!/usr/bin/env python3
"""The link cards (Tooling 197): what a shared link to the site shows, 1200x630, in the Book look.

Each card is tools/share-card/card.html, drawn from the site's own stylesheet, plates, fonts and mark, opened through a
local server in headless Chrome or Edge and saved as a JPEG under img/share/. The file is named after what went into it
(`<slug>-<hash>.jpg`): change a card's words or picture and it gets a new name, so chat apps and social sites, which
keep a preview by its image's address, fetch the new one. A card whose inputs have not changed is not redrawn.

Used by tools/make-characters.py (the character pages and /shatterbound/) and tools/make-share-cards.py (the front
page, the other pages and every devlog post). Set CHROME to the browser's path if it is not found.
"""
import functools
import hashlib
import http.server
import io
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import urllib.parse
from html import escape
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://projecttrinity.dev"
OUT = ROOT / "img" / "share"
TEMPLATE = ROOT / "tools" / "share-card" / "card.html"
W, H = 1200, 630


def _browser():
    for p in (os.environ.get("CHROME"),
              r"C:\Program Files\Google\Chrome\Application\chrome.exe",
              r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              shutil.which("google-chrome"), shutil.which("chromium"), shutil.which("chrome")):
        if p and Path(p).exists():
            return p
    raise SystemExit("No Chrome or Edge found: set CHROME to its path.")


def _files(spec):
    """The site files a card draws on, so a changed picture renames the card."""
    found = {"/css/site.css"}
    for v in json.dumps(spec).split('"'):
        if v.startswith("/img/"):
            found.add(v)
    for pid in spec.get("faces", []) + [p[0] for p in spec.get("heroes", []) + spec.get("bosses", [])]:
        found.add(f"/img/party/{pid}.webp")
    return sorted(found)


def _hash(spec):
    h = hashlib.sha256(TEMPLATE.read_bytes())
    h.update(json.dumps(spec, sort_keys=True).encode())
    for f in _files(spec):
        h.update((ROOT / f.lstrip("/")).read_bytes())
    return h.hexdigest()[:10]


class _Server:
    def __enter__(self):
        handler = functools.partial(_Quiet, directory=str(ROOT))
        self.httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        return self

    def __exit__(self, *a):
        self.httpd.shutdown()


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def _shoot(browser, url, png):
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run([browser, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                        f"--user-data-dir={profile}", f"--window-size={W},{H}", "--virtual-time-budget=10000",
                        f"--screenshot={png}", url], check=True, capture_output=True, timeout=120)


def render(cards):
    """cards: {slug: spec}. Draws each card that is new or changed; returns {slug: absolute image URL}."""
    OUT.mkdir(parents=True, exist_ok=True)
    urls, todo = {}, []
    for slug, spec in cards.items():
        name = f"{slug}-{_hash(spec)}.jpg"
        urls[slug] = f"{SITE}/img/share/{name}"
        for old in OUT.glob(f"{slug}-*.jpg"):
            if old.name != name and re.fullmatch(rf"{re.escape(slug)}-[0-9a-f]{{10}}\.jpg", old.name):
                old.unlink()
        if not (OUT / name).exists():
            todo.append((slug, spec, OUT / name))
    if todo:
        browser = _browser()
        with _Server() as srv, tempfile.TemporaryDirectory() as tmp:
            for slug, spec, dest in todo:
                png = Path(tmp) / f"{slug}.png"
                q = urllib.parse.quote(json.dumps(spec))
                _shoot(browser, f"{srv.base}/tools/share-card/card.html?c={q}", png)
                img = Image.open(png).convert("RGB")
                if img.size != (W, H):
                    img = img.crop((0, 0, W, H))
                buf = io.BytesIO()
                img.save(buf, "JPEG", quality=86, optimize=True, progressive=True)
                dest.write_bytes(buf.getvalue())
                print("drew", dest.relative_to(ROOT).as_posix())
    return urls


def tags(url, alt, indent="  "):
    """The link card's image tags, for og: and for X (twitter:), with its size and alt text."""
    a = escape(alt, quote=True)
    return "\n".join(indent + t for t in (
        f'<meta property="og:image" content="{url}">',
        f'<meta property="og:image:width" content="{W}">',
        f'<meta property="og:image:height" content="{H}">',
        f'<meta property="og:image:alt" content="{a}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:image" content="{url}">',
        f'<meta name="twitter:image:alt" content="{a}">',
    ))


_OLD = re.compile(r'^[ \t]*<meta (?:property="og:image[^"]*"|name="twitter:(?:card|image[^"]*)")[^>]*>\r?\n', re.M)


def apply(page, url, alt):
    """Writes a hand-made page's link-card image tags (after its og:url), replacing whatever it had."""
    path = ROOT / page
    raw = path.read_bytes().decode("utf-8")
    nl = "\r\n" if "\r\n" in raw else "\n"
    html = raw.replace("\r\n", "\n")
    old = re.search(r'<meta property="og:image" content="([^"]+)"', html)
    if old:  # the structured data names the same picture
        html = html.replace(old.group(1), url)
    html = _OLD.sub("", html)
    m = re.search(r'^([ \t]*)<meta property="og:url"[^>]*>\r?\n', html, re.M)
    if not m:
        raise SystemExit(f"{page}: no og:url to put the card after")
    html = html[:m.end()] + tags(url, alt, m.group(1)) + "\n" + html[m.end():]
    path.write_bytes(html.replace("\n", nl).encode("utf-8"))
