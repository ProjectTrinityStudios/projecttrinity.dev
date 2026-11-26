#!/usr/bin/env python3
"""The YouTube channel banner (2560x1440), from the link cards' parts: tools/share-card/banner.html drawn through
tools/sharecard.py. Everything that matters sits in YouTube's safe area, the centre 1546x423, which is all a phone shows.

Writes img/brand/youtube-banner.png, the file uploaded to YouTube (Customize channel, Branding, Banner image). With
--check it also writes a copy with the safe area outlined to the path given, for looking at, never for upload.
Usage: python tools/make-banner.py [--check <path.png>]
"""
import sys
from pathlib import Path

import sharecard

OUT = sharecard.ROOT / "img" / "brand" / "youtube-banner.png"


def main(argv):
    sharecard.draw("banner.html", {}, OUT, 2560, 1440)
    if len(argv) == 2 and argv[0] == "--check":
        sharecard.draw("banner.html", {"safe": True}, Path(argv[1]).resolve(), 2560, 1440)


if __name__ == "__main__":
    main(sys.argv[1:])
