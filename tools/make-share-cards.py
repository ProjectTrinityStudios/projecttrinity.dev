#!/usr/bin/env python3
"""The link cards of the hand-made pages (Tooling 197): the front page's card, which the Research, Devlog, Contact and
Request a build pages share, and one card per devlog post, its lead picture taped in beside its title.

Draws each card through tools/sharecard.py (only what changed) and writes every page's og:image and twitter:image tags,
with the card's size and alt text, and the structured data's image. The character pages' and /shatterbound/'s cards are
tools/make-characters.py's.

Usage: python tools/make-share-cards.py   (then python tools/stamp-assets.py)
"""
import re
from html import unescape
from pathlib import Path

import sharecard

ROOT = sharecard.ROOT

SITE_CARD = dict(
    kind="site", image="/img/old-hunger-1920.jpg", faces=["bastion", "oracle", "reaver", "asha"],
    heading="Swap heroes mid-fight", line="A dungeon crawler built like an MMO raid.")
SITE_ALT = ("The title Project Trinity, with Shatterbound on a name slip beneath it, over Old Hunger, a huge armoured grub "
            "on a dark dungeon floor. A paper strip below shows the four heroes' stickers and reads Swap heroes mid-fight: "
            "a dungeon crawler built like an MMO raid.")
SITE_PAGES = ["index.html", "research/index.html", "devlog/index.html", "contact/index.html", "request/index.html"]

MONTH = re.compile(r"^((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}): (.+)$")
TAPED = " Taped in beside the post's title: "


def meta(html, prop):
    m = re.search(rf'<meta property="{re.escape(prop)}" content="([^"]*)"', html)
    return unescape(m.group(1)) if m else ""


def posts():
    """Each post: its card (title, the month it covers, its lead picture) and the card's alt text."""
    found = {}
    for page in sorted((ROOT / "devlog").glob("*/index.html")):
        html = page.read_text(encoding="utf-8")
        slug = page.parent.name
        title = meta(html, "og:title")
        m = MONTH.match(title)
        eyebrow, words = (m.group(1), m.group(2)[0].upper() + m.group(2)[1:]) if m else ("", title)
        lead = next((s for s in re.findall(r'<img\s[^>]*?src="([^"]+)"', html, re.S)
                     if "/brand/" not in s and "/party/" not in s), None)
        if not lead:
            raise SystemExit(f"devlog/{slug}: no picture for its card")
        picture = meta(html, "og:image:alt").split(TAPED)[0]  # the picture's own short description, kept across runs
        found[f"devlog-{slug}"] = (f"devlog/{slug}/index.html",
                                   dict(kind="post", image=lead, eyebrow=eyebrow, title=words),
                                   f"{picture}{TAPED}{title}.")
    return found


def main():
    post_cards = posts()
    urls = sharecard.render({"site": SITE_CARD, **{k: v[1] for k, v in post_cards.items()}})
    for page in SITE_PAGES:
        sharecard.apply(page, urls["site"], SITE_ALT)
        print("tagged", page)
    for key, (page, _, alt) in post_cards.items():
        sharecard.apply(page, urls[key], alt)
        print("tagged", page)


if __name__ == "__main__":
    main()
