#!/usr/bin/env python3
"""Stamp ?v=<first 8 hex of SHA-256> on every local CSS/JS reference in all HTML files.

Idempotent: running it twice changes nothing the second time.
Usage: python tools/stamp-assets.py
"""
import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {".git", "node_modules"}
CRLF, LF = bytes([13, 10]), bytes([10])

# href="..." or src="..." whose value is a local .css/.js path, optionally with ?query and #fragment
ATTR = re.compile(
    r"""(?P<pre>\b(?:href|src)\s*=\s*)(?P<q>["'])"""
    r"""(?P<path>[^"'?#\s]+\.(?:css|js))(?:\?[^"'#]*)?(?P<frag>#[^"']*)?(?P=q)""",
    re.IGNORECASE,
)


def digest(p: Path) -> str:
    # CRLF to LF: git stores LF, which is what the server serves.
    data = p.read_bytes().replace(CRLF, LF)
    return hashlib.sha256(data).hexdigest()[:8]


def resolve(html: Path, ref: str):
    if re.match(r"^(?:[a-z][a-z0-9+.-]*:|//)", ref, re.IGNORECASE):
        return None  # external
    base = ROOT if ref.startswith("/") else html.parent
    target = (base / ref.lstrip("/")).resolve()
    try:
        target.relative_to(ROOT)
    except ValueError:
        return None
    return target if target.is_file() else None


def stamp(html: Path) -> bool:
    text = html.read_text(encoding="utf-8")

    def sub(m):
        target = resolve(html, m.group("path"))
        if target is None:
            return m.group(0)
        q = m.group("q")
        return f'{m.group("pre")}{q}{m.group("path")}?v={digest(target)}{m.group("frag") or ""}{q}'

    new = ATTR.sub(sub, text)
    if new != text:
        html.write_bytes(new.encode("utf-8"))
        return True
    return False


def main():
    changed = 0
    for html in sorted(ROOT.rglob("*.html")):
        if SKIP_DIRS & set(html.relative_to(ROOT).parts):
            continue
        if stamp(html):
            print("stamped", html.relative_to(ROOT).as_posix())
            changed += 1
    print(f"{changed} file(s) changed")


if __name__ == "__main__":
    main()
