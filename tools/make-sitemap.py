"""Write sitemap.xml and check every page's search basics (Tooling 187).

Run from the site's folder after adding or changing a page:  python tools/make-sitemap.py

It finds every served page (index.html files outside worker/ and tools/), takes its address from its own
canonical link and its last change from Git (today, for a page not yet committed), and writes sitemap.xml.
It also checks each page and stops with a list if one is missing any of:
  a <title>, a description, a canonical that matches where the page lives, its link card (og:title,
  og:description, og:url, og:image, og:image:alt, twitter:card), alt text on every <img> (alt="" is right for
  a picture that only decorates), exactly one <h1>, and structured data (JSON-LD) that parses.
"""
import datetime
import json
import pathlib
import re
import subprocess
import sys

SITE = "https://projecttrinity.dev"
ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {"worker", "tools", "node_modules", ".git"}


def pages():
    for path in sorted(ROOT.rglob("index.html")):
        rel = path.relative_to(ROOT)
        if rel.parts[0] in SKIP:
            continue
        yield path, "/" + "/".join(rel.parts[:-1]) + ("/" if len(rel.parts) > 1 else "")


def last_change(path):
    try:
        dirty = subprocess.run(["git", "status", "--porcelain", "--", str(path)], cwd=ROOT,
                               capture_output=True, text=True, check=True).stdout.strip()
        if not dirty:
            day = subprocess.run(["git", "log", "-1", "--format=%cs", "--", str(path)], cwd=ROOT,
                                 capture_output=True, text=True, check=True).stdout.strip()
            if day:
                return day
    except (OSError, subprocess.CalledProcessError):
        pass
    return datetime.date.today().isoformat()


def meta(html, attr, name):
    m = re.search(r'<meta\s+%s="%s"\s+content="([^"]*)"' % (attr, re.escape(name)), html)
    return m.group(1) if m else None


def check(path, where, html):
    problems = []
    title = re.search(r"<title>([^<]*)</title>", html)
    if not title or not title.group(1).strip():
        problems.append("no <title>")
    if not meta(html, "name", "description"):
        problems.append("no description")
    canon = re.search(r'<link rel="canonical" href="([^"]*)"', html)
    if not canon:
        problems.append("no canonical")
    elif canon.group(1) != SITE + where:
        problems.append("canonical %s is not %s" % (canon.group(1), SITE + where))
    for prop in ("og:title", "og:description", "og:url", "og:image", "og:image:alt"):
        if not meta(html, "property", prop):
            problems.append("no " + prop)
    if not meta(html, "name", "twitter:card"):
        problems.append("no twitter:card")
    for img in re.findall(r"<img\b[^>]*>", html, flags=re.S):
        if not re.search(r'\balt="', img):
            problems.append("an image without alt: " + re.sub(r"\s+", " ", img)[:90])
    h1s = len(re.findall(r"<h1\b", html))
    if h1s != 1:
        problems.append("%d <h1> (one is right)" % h1s)
    blocks = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, flags=re.S)
    if not blocks:
        problems.append("no structured data (JSON-LD)")
    for block in blocks:
        try:
            json.loads(block)
        except ValueError as error:
            problems.append("structured data does not parse: %s" % error)
    return canon.group(1) if canon else SITE + where, problems


def main():
    rows, failed = [], False
    for path, where in pages():
        html = path.read_text(encoding="utf-8")
        url, problems = check(path, where, html)
        for problem in problems:
            print("%s: %s" % (path.relative_to(ROOT).as_posix(), problem))
            failed = True
        rows.append((url, last_change(path)))
    rows.sort(key=lambda row: (row[0] != SITE + "/", row[0]))
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    lines += ["  <url><loc>%s</loc><lastmod>%s</lastmod></url>" % row for row in rows]
    lines.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print("wrote sitemap.xml: %d pages" % len(rows))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
