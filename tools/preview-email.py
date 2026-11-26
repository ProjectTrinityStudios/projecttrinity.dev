"""Render the Kit email template with sample emails, for screenshots before it goes into Kit.

    python tools/preview-email.py [out-folder]

Writes <out>/welcome.html and <out>/confirm.html; open them in a browser in light and dark mode for Day and Night (the
template follows prefers-color-scheme, as Apple Mail and Outlook on Mac do). The out folder defaults to email/preview/,
which is git-ignored. Kit's own variables are filled with harmless stand-ins; Kit fills the real ones when it sends.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "email" / "kit-template.html"

SAMPLES = {
    # The welcome email as Kit's editor writes it from email/words.md.
    "welcome": """
<h2>Welcome to the party</h2>
<p>Thanks for joining. Project Trinity: Shatterbound is a dungeon crawler built around the tank, healer and DPS of MMO raiding: four heroes, MMO-style bosses with telegraphed mechanics, and an AI party that plays the members you aren't. You can swap into any of them mid-fight.</p>
<p>Here's what to expect: a note when there's a new devlog post or a new build to try. Not often, and every email has a way out at the bottom.</p>
<p>While you wait, the newest post is <a href="https://projecttrinity.dev/devlog/i-miss-playing-with-my-friends/">Meet Project Trinity: Shatterbound</a>, and the heroes and bosses are on <a href="https://projecttrinity.dev/shatterbound/">the Shatterbound page</a>.</p>
<p>One question: which hero would you play first, Bastion the tank, Oracle the healer, or Reaver or Asha on damage? Just reply. Every reply is read.</p>
<p>Project Trinity Studios</p>
<p>P.S. If this landed in Promotions or Updates, drag it to your Primary inbox so the next one finds you.</p>
""",
    # The confirm email, with the button Kit adds.
    "confirm": """
<p>Hi,</p>
<p>Someone asked to join the Project Trinity: Shatterbound email list with this address. If that was you, press the button and you're on it.</p>
<p><a class="btn" href="#">Confirm and join</a></p>
<p>If it wasn't you, ignore this email and nothing happens. You won't hear from the list again.</p>
<p>Project Trinity Studios</p>
""",
}

STAND_INS = {
    "unsubscribe_url": "#unsubscribe",
    "subscriber_preferences_url": "#preferences",
    "address": "(the studio's mailing address, from Kit's settings)",
}


def render(template: str, content: str) -> str:
    out = template.replace("{{ message_content }}", content.strip())
    for name, value in STAND_INS.items():
        out = out.replace("{{ %s }}" % name, value)
    left = re.findall(r"{{\s*[\w.]+\s*}}", out)
    if left:
        raise SystemExit(f"unfilled Kit variables: {left}")
    return out


def main() -> None:
    out_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "email" / "preview"
    out_dir.mkdir(parents=True, exist_ok=True)
    template = TEMPLATE.read_text(encoding="utf-8")
    for required in ("{{ message_content }}", "{{ unsubscribe_url }}", "{{ address }}"):
        if required not in template:
            raise SystemExit(f"the template lacks {required}, which Kit requires")
    for name, content in SAMPLES.items():
        page = render(template, content)
        (out_dir / f"{name}.html").write_text(page, encoding="utf-8")
        print(out_dir / f"{name}.html")


if __name__ == "__main__":
    main()
