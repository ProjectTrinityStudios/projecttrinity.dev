#!/usr/bin/env python3
"""Writes /shatterbound/ and one page per character (/shatterbound/<id>/) from the words below (Tooling 183).

One source for every hero's and boss's words: the scroll on /shatterbound/ and the character's own page are both written
from here, so a fix is made once. The skill names and lines are the game's own player-facing words
(unity-b/Assets/Story/Tables/Words_en.asset, the `skill.*.about` rows), with the numbers left out as the site always has.
The header and footer below are the same as every other page's: change one, change them all.

Usage: python tools/make-characters.py   (then python tools/stamp-assets.py)
"""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://projecttrinity.dev"

# ---- The heroes, by role ------------------------------------------------------------------------------------------
# Each skill: (name, tag, line, clip). tag is "Primary", "Secondary", "Passive" or "". clip is a file in /video/skills/
# (cut from existing films, never new filming) or None.
HEROES = [
    dict(
        id="bastion", name="Bastion", group="tank", role="Tank", stamp="tank", pron=("he", "him", "his"),
        resource="Resolve",
        resource_about="Bastion earns Resolve for each hit he blocks and for each of his own that lands, and spends it on Vengeful Riposte.",
        line="The wall at the front. Every hit he blocks builds the Resolve he spends on Vengeful Riposte.",
        painted_alt="Bastion's portrait: a broad-shouldered man with a red crest of hair and a hard stare, in red and black armour.",
        render_alt="Bastion: a broad man with a red crest of hair, arms crossed over spiked red and black plate, a tall shield at his back.",
        banner_alt="Bastion in a dark stone room, arms crossed over his red and black plate, his tall shield behind him.",
        key=["Block", "Challenger's Roar", "Clear Ground"],
        kit=[
            ("Bash", "Primary", "Bastion bashes the enemies in front of him, building Resolve. Three swings chain into one another.", None),
            ("Block", "Secondary", "Bastion raises his shield and blocks hits from the front until it tires. Raising it just as a hit lands makes his next damaging skill hit harder.", "bastion-block"),
            ("Shield Slam", "", "Bastion jumps and slams his shield down on the enemies in front of him, and the blow refills his shield. He takes less damage on the way down.", None),
            ("Spear of the Wall", "", "Bastion strikes, sends a wave out in front of him, then throws his spear. Its hits pin enemies in place for a moment, though never a boss.", None),
            ("Challenger's Roar", "", "Bastion roars, dealing damage to every enemy around him and taunting them.", "bastion-challengers-roar"),
            ("Clear Ground", "", "Bastion strikes every enemy around him with his shield's stored damage, and clears the lingering pools enemies have left on the ground near him.", "bastion-clear-ground"),
            ("Vengeful Riposte", "", "Bastion spends Resolve on three heavy counterstrikes. Every hit lowers the target's Defense, stacking up to three times.", None),
        ],
    ),
    dict(
        id="oracle", name="Oracle", group="healer", role="Healer", stamp="healer", pron=("she", "her", "her"),
        resource="Mana",
        resource_about="Oracle regains Mana only by landing Glimmer and Purifying Lance.",
        line="Heals from range. Her Mana comes back only when Glimmer and Purifying Lance land, so she fights to keep healing.",
        painted_alt="Oracle's portrait: a woman with swept-back grey hair and a high collar, against a pale blue sky.",
        render_alt="Oracle: a woman with swept-back grey hair, hands clasped, in a navy coat with a high white and gold collar.",
        banner_alt="Oracle in a dark stone room, hands clasped before her navy coat, its white and gold collar catching the light.",
        key=["Mending Bolt", "Circle of Renewal", "Aegis Chorus"],
        kit=[
            ("Glimmer", "Primary", "Oracle fires bolts of light, regaining Mana with each hit. Three casts chain into one another.", None),
            ("Flicker Step", "Secondary", "Oracle teleports to the spot she is aiming at.", None),
            ("Mending Bolt", "", "Oracle heals the friend she targets with a bolt that follows them and passes through walls.", "oracle-mending-bolt"),
            ("Circle of Renewal", "", "Oracle places a circle of light. Friends in it heal every second while it lasts.", "oracle-circle-of-renewal"),
            ("Purifying Lance", "", "Oracle throws a lance of light that burns whatever it hits. A hit pours Mana back into her.", None),
            ("Aegis Chorus", "", "Oracle sings to the party. When the song ends, everyone heals and their Defense rises for a time.", "oracle-aegis-chorus"),
            ("Intervention", "", "Oracle charges a beam that heals friends and burns enemies in its path. The longer she charges, the farther it reaches; she cannot move while charging.", None),
        ],
    ),
    dict(
        id="reaver", name="Reaver", group="dps", role="Melee DPS", stamp="melee", pron=("he", "him", "his"),
        resource="Momentum",
        resource_about="Reaver earns Momentum with every hit, and more from behind. Grand Larceny and Swagger spend it.",
        line="A thief with two blades. Hits from behind earn more Momentum, and Grand Larceny and Swagger spend it.",
        painted_alt="Reaver's portrait: a young man with tousled brown hair and a half smile, against a red sky.",
        render_alt="Reaver: a young man with tousled brown hair, sitting on the floor with one knee up, in a dark coat over an open white shirt.",
        banner_alt="Reaver sitting on the floor of a dark stone room, one knee up, in a dark coat over an open white shirt.",
        key=["Sleight of Hand", "Pickpocket", "Grand Larceny"],
        kit=[
            ("Quick Hands", "Primary", "Reaver strikes the enemies in front of him. Hits from behind earn more Momentum. Three strikes chain into one another.", None),
            ("Ankle Tax", "Secondary", "Reaver slashes at the target's legs again and again, slowing it for a moment.", None),
            ("Sleight of Hand", "", "Reaver distracts the enemies in front of him with quick slashes, leaving them open to Pickpocket.", None),
            ("Pickpocket", "", "Reaver dashes forward with a flurry of cuts, and they cut deeper right after Sleight of Hand.", None),
            ("Clean Sweep", "", "Reaver swings his blades, sending cutting waves out in front of him.", None),
            ("Grand Larceny", "", "Reaver spins through every enemy around him, cutting again and again.", None),
            ("Swagger", "", "Reaver struts for a while, moving faster with more crit chance.", None),
        ],
    ),
    dict(
        id="asha", name="Asha", group="dps", role="Ranged DPS", stamp="ranged", pron=("she", "her", "her"),
        resource="Fizz",
        resource_about="Asha earns Fizz for each of her hits that lands. Last Call and Glow Up spend it.",
        line="Leaves potion zones on the ground and pops them with her pistols.",
        painted_alt="Asha's portrait: a woman with long black hair falling over one shoulder, against a pink sky.",
        render_alt="Asha: a woman with long black hair, one hand on her hip, in a pink cropped jacket.",
        banner_alt="Asha in a dark stone room, long black hair over a pink cropped jacket, one hand on her hip.",
        key=["Spiked Punch", "Happy Hour", "Last Call"],
        kit=[
            ("Round of Shots", "Primary", "Asha fires quick shots from both pistols. Three rounds chain into one another.", None),
            ("Sour Shot", "Secondary", "Asha throws a shot glass that leaves an acid zone on the ground. Enemies in it lose Defense for a time.", None),
            ("Spiked Punch", "", "Asha lobs her next potion, starting a zone or adding to one of hers.", None),
            ("Happy Hour", "Passive", "Asha's zones hold her two newest potions. When she pops one, it deals its remaining damage at once and the potions mix into her guns; every shot carries the mix until the load runs out.", "asha-happy-hour"),
            ("Pop the Bottle", "", "Asha flips and fires both guns, popping the zone under her target.", None),
            ("Tik Tok", "", "Asha plants her feet and fires a long burst of shots.", None),
            ("Last Call", "", "Asha unloads her guns and pops every zone she has. Popping a mixed zone while she stands in her Glow Up sets off the jackpot.", None),
            ("Glow Up", "", "Asha drops a zone at her feet. Each pulse gives friends inside more speed and crit chance.", None),
        ],
    ),
]

# What each clip shows, for its label (the clips are silent loops cut from existing films of the game).
CLIP_LABEL = {
    "bastion-block": "Bastion raises his shield against a training dummy, beside the game's page for the skill.",
    "bastion-challengers-roar": "Bastion roars in the training yard; red ribbons sweep out and every dummy around him turns to him.",
    "bastion-clear-ground": "In the fight with Old Hunger, Bastion clears the pools of bile on the floor around him.",
    "oracle-mending-bolt": "Oracle sends a bolt of light that curves to the friend she has targeted.",
    "oracle-circle-of-renewal": "Oracle places a circle of light on the training yard's floor.",
    "oracle-aegis-chorus": "Oracle sings, and a glow settles over each of the party.",
    "asha-happy-hour": "Asha lobs potions into one zone, beside the game's page for the skill.",
}

GROUPS = [
    ("tank", "Tank", ["tank"]),
    ("healer", "Healer", ["healer"]),
    ("dps", "DPS", ["melee", "ranged"]),
]

# ---- The bosses, in the order you meet them -------------------------------------------------------------------------
JOB = {
    "tank": ("bastion", "tank", "Tank"),
    "healer": ("oracle", "healer", "Healer"),
    "dps": ("asha", "ranged", "DPS"),
}
BOSSES = [
    dict(
        id="patchwork", name="Patchwork", place="Patchwork's Hunt",
        about="Since the crash, nobody goes past the broken gate. Something huge walks the wrecked halls in there, built of parts that do not belong together.",
        painted_alt="Patchwork's portrait: a white-bearded figure in a hood with a golden halo, stitched together from bright mismatched parts.",
        render_alt="Patchwork: a white-bearded figure in a pointed white hood under a golden ring of orbs, one arm red with a white star, the other grey machinery.",
        card_alt="Patchwork standing in a wrecked stone hall: a squat, bearded brawler built from mismatched parts, a red cartoon hammer in one hand and a ghostly warlock's shadow behind him.",
        banner_alt="Patchwork in a stone hall with a bright checkered floor: white hood, white beard, a golden ring of orbs behind his head.",
        walk="""<li><b>Cartoon Hammer</b>: “I'll stamp you out!” A chain of slams on the party. Every slam that lands earns him another.</li>
<li><b>Cybernetic Tank Buster</b> comes after two <b>Cybernetic Stomp</b>s: a cone in front of him that can't be blocked. If it hits, <b>Cybernetic Firearm</b> follows on someone else.</li>
<li><b>Stone Wizard Channel</b>: stun him and he staggers; let it finish and <b>Meteor Shower</b> falls.</li>
<li><b>Warlock Shadow</b>: “Who stole my shadow?” He marks a hero and <b>Shadow Charge</b>s at them. Charging into a <b>Crash Pillar</b> leaves him <b>Crash</b>ed: he can't attack and takes more damage.</li>
<li><b>The Collector</b> puts <b>Debt</b>, a growing damage over time, on two heroes.</li>""",
        jobs=dict(
            tank="Step out of the Tank Buster's cone; your shield won't stop it.",
            healer="When The Collector calls in a debt, the two heroes with Debt come first.",
            dps="Lead his Shadow Charge into a Crash Pillar, then hit him hard while he's Crashed.",
        ),
    ),
    dict(
        id="giant", name="The Giant", place="The Hungry Deep: The Giant's Gate",
        about="A Giant keeps the gate to the Hungry Deep. Whatever the Chanters feed down there, nothing reaches it without getting past him first.",
        painted_alt="The Giant's portrait: a horned face of burning orange with glowing eyes.",
        render_alt="The Giant: a tall horned demon, black with ribs of molten orange, a burning ring behind his head and an iron-banded club in one hand.",
        card_alt="The Giant at the gate to the Hungry Deep: a tall, thin horned demon, black with molten orange cracks, before a huge iron-banded door.",
        banner_alt="The Giant in a dim stone hall, black with ribs of molten orange, a burning ring behind his horned head.",
        walk="""<li><b>Swipe</b>, and <b>Swipe</b> into <b>Cleave</b>: wide arcs in front of him with no warning on the floor. Cleave is the heavy one.</li>
<li><b>Storm</b>, at half health and again near the end: a ring around him that hits three times and can't be blocked. Every hit leaves a burn that stacks.</li>
<li>No adds and no phases: it's you and him.</li>""",
        jobs=dict(
            tank="Keep him facing you. Swipe and Cleave give no warning.",
            healer="The Storm's burn stacks with every hit. Top people up as it ends.",
            dps="Get out of the Storm's ring early: every hit you take adds to the burn.",
        ),
    ),
    dict(
        id="old-hunger", name="Old Hunger", place="The Hungry Deep: The Feeding Pit",
        about="Something is eating its way up from below the Crossroads. The Chanters call it Old Hunger and keep it fed. It is small for now, and they mean to change that.",
        painted_alt="Old Hunger's portrait: a gaping, fleshy maw ringed with teeth.",
        render_alt="Old Hunger: a huge armoured grub with a spiked shell and a split, toothed jaw, crouched on curled claws.",
        card_alt="Old Hunger in his chamber: a huge armoured grub with a split, toothed jaw, lit pale against a dark floor.",
        banner_alt="Old Hunger on the tiled floor of his dark chamber, his split, toothed jaw open, his shell bristling with spikes.",
        walk="""<li><b>Imps</b> crawl out of the Tears and feed him. Every <b>Fed</b> stack makes him hit harder. When “HE'S FULL”, he <b>Retch Slam</b>s around himself and a <b>Retch Shower</b> hunts the party.</li>
<li>The <b>Devouring Glutton</b> comes through a Tear and casts <b>Seize</b> on whoever stands farthest away, never the Tank: “THE GLUTTON HAS ONE OF US”. That hero is <b>Held</b> and can't move, cast, dodge or block. The party calls it mind control.</li>
<li>The Glutton drags its catch to Old Hunger. If it reaches him, he takes them both and hits far harder. Kill the Glutton first and the hero goes free.</li>
<li><b>Bile Spit</b> leaves pools of bile that stay, and every pool makes him stronger (<b>Pooled Bile</b>). Bastion's <b>Clear Ground</b> clears them.</li>
<li><b>Burrow</b>: he tunnels to the farthest hero and comes up with <b>Erupt</b>. Up close: <b>Snap Bite</b> and <b>Head Rake</b> in front, a <b>Tail Sweep</b> behind.</li>""",
        jobs=dict(
            tank="Hold him away from the bile. As Bastion, Clear Ground wipes the pools.",
            healer="Seize takes whoever stands farthest away, so stay with the party. Heal everyone up after each Retch.",
            dps="Kill Imps before they reach him. On “THE GLUTTON HAS ONE OF US”, switch to the Glutton and kill it.",
        ),
    ),
    dict(
        id="maera", name="Maera", place="The Hungry Deep: The Lightless Shoal",
        about="The lamp on the Lightless Shoal has gone dark. Its keeper, Maera, still walks the shore, but something else looks out through her eyes.",
        painted_alt="Maera's portrait: a stern face framed by long, swept-back hair, against sea green.",
        render_alt="Maera: a grey-haired woman with a stern face, in a dark hooded cloak, a huge anchor over her shoulder.",
        card_alt="Maera on her shore, lantern in hand and an anchor over her shoulder, inside a ring of pale light on dark water.",
        banner_alt="Maera on a dark, rain-wet shore at night, a huge anchor over her shoulder, her grey hair lit cold blue.",
        walk="""<li><b>The Lamp</b> is on your side. If it goes out, the pull is lost. It starts low and calls for healing: “THE LAMP CALLS FOR HEALING”.</li>
<li><b>Spume Crawlers</b>, <b>Catfish</b> and <b>Rakes</b> come for the Lamp. A Spume Crawler killed near it leaves <b>Lamplight</b>, a pool that heals it.</li>
<li><b>The Dark</b>: your damage to her is cut to a tenth.</li>
<li><b>The Dark Ring</b> follows her. Heroes in <b>The Small Light</b> are safe from it, and while she stands in it her <b>Deep Hunger</b> can't grow.</li>
<li>When she <b>Sink</b>s, dodge <b>Lantern Rain</b>, <b>The Dark Wheel</b>, <b>Drowning Chains</b> and <b>The Chasing Tide</b>. Between those: <b>Anchor Slam</b>, which can't be blocked, and <b>Anchor Throw</b>, which hooks a hero in for <b>Anchor Spin</b>.</li>""",
        jobs=dict(
            tank="Hold her inside The Small Light as it moves.",
            healer="The Lamp is your second tank. Heal it every time it gutters.",
            dps="Kill the adds going for the Lamp, and kill Spume Crawlers close to it.",
        ),
    ),
]

# ---- The shared page parts --------------------------------------------------------------------------------------------
HEAD = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{description}">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#c3b3ea">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#12163a">
  <link rel="canonical" href="{url}">

  <!-- The link card: what a shared link shows -->
  <meta property="og:type" content="website">
  <meta name="author" content="Project Trinity Studios">
  <meta property="og:site_name" content="Project Trinity Studios">
  <meta property="og:title" content="{og_title}">
  <meta property="og:description" content="{og_description}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{image_alt}">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/fonts/CaveatBrush-Regular.ttf" as="font" type="font/ttf" crossorigin>
  <link rel="stylesheet" href="/css/site.css">
  <script src="/js/site.js" defer></script>
</head>
<body>
  <a class="skip" href="#main">Skip to the page</a>

  <header class="site-header" data-header>
    <div class="header-bar">
      <a class="mark" href="/">
        <span class="mark-glyph" aria-hidden="true"><svg class="mark-shard" width="26" height="26" viewBox="0 0 32 32" focusable="false"><use href="#shard"/></svg></span>
        <span>Project Trinity</span>
      </a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="site-menu" data-menu-button>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" stroke-width="2" stroke-linecap="round"/></svg>
        <span>Menu</span>
      </button>
      <div class="header-menu" id="site-menu">
        <nav aria-label="Site">
          <ul>
          <li><a href="/shatterbound/"{current}>Shatterbound</a></li>
          <li><a href="/research/">Research</a></li>
          <li><a href="/devlog/">Devlog</a></li>
          <li><a href="/contact/">Contact</a></li>
          </ul>
        </nav>
        <div class="header-tools">
          <a class="button button-gold header-cta" href="/request/">Request a build</a>
          <button class="theme-toggle" type="button" aria-pressed="false" data-theme-toggle>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>
            <span class="on-day">Day</span><span class="on-night">Night</span><span class="visually-hidden"> pages (switch to Night)</span>
          </button>
        </div>
      </div>
    </div>
  </header>
"""

FOOT = """
  <footer class="colophon">
    <div class="colophon-grid">
      <div>
        <h2>Pages</h2>
        <ul>
          <li><a href="/shatterbound/">Shatterbound</a></li>
          <li><a href="/research/">Research</a></li>
          <li><a href="/devlog/">Devlog</a></li>
          <li><a href="/contact/">Contact</a></li>
          <li><a href="/request/">Request a build</a></li>
        </ul>
      </div>
      <div>
        <h2>Contact</h2>
        <ul>
          <li><a href="/contact/">Send a message</a></li>
          <li><a href="mailto:hello@projecttrinity.dev">hello@projecttrinity.dev</a></li>
        </ul>
      </div>
      <div>
        <h2>Video</h2>
        <p><a href="https://www.youtube.com/@ProjectTrinityStudios">YouTube: @ProjectTrinityStudios</a></p>
      </div>
      <div class="privacy">
        <h2>Privacy</h2>
        <p>This site sets no cookies and runs no trackers or ads. The gameplay video plays from YouTube's privacy-enhanced player, and only once you press play; from then, YouTube's own privacy terms apply to it. If you request a build or send a message, it goes to the project mailbox; your email joins the list only if you ask. All of it is for people 13 or older.</p>
      </div>
    </div>
    <p class="colophon-foot">Disclosure: AI tools and AI-generated assets were used in making this game.</p>
    <p class="colophon-foot">© 2026 Project Trinity Studios. Project Trinity: Shatterbound is in alpha.</p>
  </footer>

  <svg width="0" height="0" class="visually-hidden" aria-hidden="true" focusable="false">
    <!-- The family mark (Tooling 180) replaces this shard when its clean files land. -->
    <symbol id="shard" viewBox="0 0 32 32">
      <path d="M16 2 27 14 16 30 5 14Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M16 2 16 30M5 14 16 18 27 14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
    </symbol>
  </svg>
</body>
</html>
"""


def e(s):
    return escape(s, quote=True)


def stamp_img(kind, cls="stamp"):
    return f'<img class="{cls}" src="/img/book/stamp-{kind}.svg" width="120" height="120" alt="">'


def sticker(pid, painted_alt, render_alt, stamp=None, eager=False, sizes="(max-width: 760px) 60vw, 260px"):
    """The swap (Tooling 182): the painted sticker and the render cut-out side by side in the page; the site's one
    portrait setting (js/site.js, PORTRAITS) shows one and the other is never fetched (display none, loading lazy)."""
    load = 'loading="eager"' if eager else 'loading="lazy"'
    return (
        f'<span class="sticker" data-portrait="{pid}">'
        f'<img class="pt-painted" src="/img/party/{pid}.webp" width="256" height="256" {load} alt="{e(painted_alt)}">'
        f'<img class="pt-render" src="/img/portraits/{pid}-480.webp" srcset="/img/portraits/{pid}-480.webp 480w, /img/portraits/{pid}-800.webp 800w" '
        f'sizes="{sizes}" width="480" height="600" {load} alt="{e(render_alt)}">'
        + (stamp_img(stamp) if stamp else "")
        + "</span>"
    )


def clip(name, label):
    return (
        f'<figure class="skill-clip"><span class="photo">'
        f'<video data-loop muted loop playsinline preload="none" poster="/video/skills/{name}.jpg" width="960" height="540" aria-label="{e(label)}">'
        f'<source src="/video/skills/{name}.mp4" type="video/mp4"></video></span></figure>'
    )


def skill_li(name, tag, line, clipname, with_clip=True):
    t = f' <span class="skill-tag">{tag}</span>' if tag else ""
    c = clip(clipname, CLIP_LABEL[clipname]) if (clipname and with_clip) else ""
    return f'<li><b>{e(name)}</b>{t} <span>{e(line)}</span>{c}</li>'


def kit_by_name(h, name):
    return next(k for k in h["kit"] if k[0] == name)


def role_pill(h):
    icon = {"tank": "i-tank", "healer": "i-healer", "dps": "i-dps"}[h["group"]]
    return f'<span class="role"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#{icon}"/></svg>{e(h["role"])}</span>'


ICONS = """    <symbol id="i-tank" viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5Z"/></symbol>
    <symbol id="i-healer" viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/></symbol>
    <symbol id="i-dps" viewBox="0 0 24 24"><path d="M21 3v4L10 18l-4-4L17 3Z"/><path d="M4 13l7 7-1.4 1.4-7-7Z"/><path d="M6.5 18.9 3.9 21.5 2.5 20.1 5.1 17.5Z"/></symbol>
"""


def page(path, head_args, body):
    foot = FOOT.replace("    </symbol>\n  </svg>", "    </symbol>\n" + ICONS + "  </svg>")
    html = HEAD.format(**head_args) + body + foot
    out = ROOT / path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8", newline="\n")
    print("wrote", path)


# ---- /shatterbound/ ---------------------------------------------------------------------------------------------------
def hero_scroll(h):
    he, him, his = h["pron"]
    skills = "\n".join(
        "              " + skill_li(*kit_by_name(h, n)) for n in h["key"]
    )
    return f"""          <li class="hero-slot" data-hero="{h['id']}">
            <details class="scroll" id="{h['id']}">
              <summary>
                {sticker(h['id'], h['painted_alt'], h['render_alt'], h['stamp'])}
                <span class="scroll-tab">
                  <span class="scroll-name">{e(h['name'])}</span>
                  <span class="scroll-sub">{e(h['role'])} <span aria-hidden="true">·</span> {e(h['resource'])}</span>
                  <span class="scroll-pull"><span class="on-shut">Open {his} scroll</span><span class="on-open">Roll it up</span></span>
                </span>
              </summary>
              <div class="scroll-body">
                <p class="one-line">{e(h['line'])}</p>
                <ul class="skills" aria-label="{e(h['name'])}'s key skills">
{skills}
                </ul>
                <a class="more" href="/shatterbound/{h['id']}/">All of {e(h['name'])}'s skills, and {his} job in each fight</a>
              </div>
            </details>
          </li>"""


UNKNOWN = """          <li class="hero-slot is-unknown">
            <div class="scroll is-sealed">
              <span class="sticker sticker-unknown" role="img" aria-label="A hero not yet shown"><span aria-hidden="true">?</span></span>
              <span class="scroll-tab" aria-hidden="true"></span>
            </div>
          </li>"""


def boss_jobs(b, level=5):
    out = []
    for key in ("tank", "healer", "dps"):
        hid, stamp, label = JOB[key]
        stamps = stamp_img("melee", "job-stamp") + stamp_img("ranged", "job-stamp") if key == "dps" else stamp_img(stamp, "job-stamp")
        out.append(f"""                <div class="job" data-hero="{hid}">
                  <h{level}>{stamps}{label}</h{level}>
                  <p>{b['jobs'][key]}</p>
                </div>""")
    return "\n".join(out)


def banner(b, sizes="(min-width: 1100px) 860px, 100vw"):
    pid = b["id"]
    return (
        f'<span class="photo banner" data-banner="{pid}">'
        f'<img class="pt-painted" src="/img/fights/{pid}-800.jpg" srcset="/img/fights/{pid}-800.jpg 800w, /img/fights/{pid}-1280.jpg 1280w" '
        f'sizes="{sizes}" width="1280" height="720" loading="lazy" alt="{e(b["card_alt"])}">'
        f'<img class="pt-render" src="/img/portraits/{pid}-16x9-800.jpg" srcset="/img/portraits/{pid}-16x9-800.jpg 800w, /img/portraits/{pid}-16x9-1280.jpg 1280w" '
        f'sizes="{sizes}" width="1280" height="720" loading="lazy" alt="{e(b["banner_alt"])}">'
        f"</span>"
    )


def boss_card(b):
    return f"""        <article class="boss-card" id="{b['id']}" aria-labelledby="{b['id']}-name">
          <figure class="portrait">
            {sticker(b['id'], b['painted_alt'], b['render_alt'])}
          </figure>
          <div>
            <h3 id="{b['id']}-name"><a href="/shatterbound/{b['id']}/">{e(b['name'])}</a></h3>
            <p class="boss-place">{e(b['place'])}</p>
            <p class="about">{e(b['about'])}</p>
          </div>
          <details class="walk">
              <summary>How the fight works <span class="spoiler">(spoilers)</span></summary>
              <div class="walk-body">
                {banner(b)}
                <ul class="shard-list">
{b['walk']}
                </ul>
                <div>
                  <h4>Your job</h4>
                  <div class="jobs">
{boss_jobs(b)}
                  </div>
                </div>
                <a class="more" href="/shatterbound/{b['id']}/">{e(b['name'])}'s own page</a>
              </div>
          </details>
        </article>"""


def shatterbound():
    groups = []
    for gid, label, stamps in GROUPS:
        heroes = [h for h in HEROES if h["group"] == gid]
        slots = "\n".join(hero_scroll(h) for h in heroes) + "\n" + UNKNOWN
        st = "".join(stamp_img(s, "group-stamp") for s in stamps)
        groups.append(f"""        <section class="role-group role-{gid}" aria-labelledby="group-{gid}">
          <h3 class="role-title" id="group-{gid}">{st}<span>{label}</span></h3>
          <ul class="hero-slots">
{slots}
          </ul>
        </section>""")
    bosses = "\n".join(boss_card(b) for b in BOSSES)
    body = f"""
  <main id="main" class="page-top">
    <header class="wrap page-head">
      <p class="eyebrow">The game</p>
      <h1><span class="title-mark title-star">Shatterbound</span></h1>
      <p class="lede">Four heroes, a party AI that plays whichever ones you don't, and bosses built like raid fights. Swap into any hero mid-fight.</p>
    </header>

    <section class="wrap section" aria-labelledby="heroes-title">
      <div class="section-head">
        <h2 id="heroes-title"><span class="title-mark">The heroes</span></h2>
      </div>
      <p class="section-lede">Each hero holds down a scroll. Open it for their key skills, or go on to their own page.</p>
      <div class="roles">
{chr(10).join(groups)}
      </div>
    </section>

    <section class="wrap section" aria-labelledby="bosses-title">
      <div class="section-head">
        <h2 id="bosses-title"><span class="title-mark">The bosses</span></h2>
      </div>
      <p class="section-lede">In the order you meet them. Each fight is folded away until you open it.</p>
      <div class="bosses">
{bosses}
        <article class="boss-card is-coming" id="don-fortuna" aria-labelledby="don-fortuna-name">
          <div class="portrait" aria-hidden="true"><span class="coming-plate"><svg class="coming-mark" width="64" height="64" viewBox="0 0 32 32" focusable="false"><use href="#shard"/></svg></span></div>
          <div>
            <h3 id="don-fortuna-name">Don Fortuna <span class="tag-coming">Coming</span></h3>
            <p class="boss-place">The High Table</p>
            <p class="about">Don Fortuna runs the High Table, a casino where the House rigs every draw while its engines stand. Break an engine, and that draw plays fair.</p>
          </div>
        </article>
      </div>
    </section>
  </main>
"""
    page("shatterbound/index.html", dict(
        title="Shatterbound: the heroes and the bosses | Project Trinity",
        description="The heroes of Project Trinity: Shatterbound by role, Tank, Healer and DPS, with their key skills, and how each boss fight works.",
        url=f"{SITE}/shatterbound/",
        og_title="Shatterbound: the heroes and the bosses",
        og_description="Bastion, Oracle, Reaver and Asha, and the bosses they fight: Patchwork, the Giant, Old Hunger and Maera.",
        image=f"{SITE}/img/share-card.jpg",
        image_alt="Old Hunger, a huge armoured grub with a split jaw, lit pale against a dark dungeon floor, under the title Project Trinity: Shatterbound.",
        current=' aria-current="page"',
    ), body)


# ---- /shatterbound/<hero>/ ------------------------------------------------------------------------------------------
def others_row(current_id, people):
    items = []
    for p in people:
        if p["id"] == current_id:
            continue
        items.append(f'<li><a href="/shatterbound/{p["id"]}/" data-hero="{p["id"]}">'
                     f'{sticker(p["id"], p["painted_alt"], p["render_alt"], sizes="120px")}'
                     f'<strong class="slip">{e(p["name"])}</strong></a></li>')
    return "\n          ".join(items)


def hero_page(h):
    he, him, his = h["pron"]
    kit = "\n".join("          " + skill_li(*k) for k in h["kit"])
    job_key = h["group"]
    fights = "\n".join(
        f"""          <li><a href="/shatterbound/{b['id']}/">{e(b['name'])}</a> <span>{b['jobs'][job_key]}</span></li>"""
        for b in BOSSES
    )
    body = f"""
  <main id="main" class="page-top" data-hero="{h['id']}">
    <header class="wrap char-head">
      <figure class="char-portrait">
        {sticker(h['id'], h['painted_alt'], h['render_alt'], h['stamp'], eager=True, sizes="(max-width: 760px) 70vw, 340px")}
      </figure>
      <div class="char-words">
        <p class="eyebrow"><a href="/shatterbound/#{h['id']}">The heroes</a> <span aria-hidden="true">/</span> {e(h['role'])}</p>
        <h1><span class="title-mark">{e(h['name'])}</span></h1>
        <p class="role-line">{role_pill(h)} <span class="resource">Resource: {e(h['resource'])}</span></p>
        <p class="lede">{e(h['line'])}</p>
        <p class="char-note">{e(h['resource_about'])}</p>
        <p class="char-swap">Play {him} yourself, or swap to another hero mid-fight and the party AI plays {him} for you.</p>
      </div>
    </header>

    <div class="wrap char-banner pt-render-only">
      <span class="photo banner"><img src="/img/portraits/{h['id']}-16x9-800.jpg" srcset="/img/portraits/{h['id']}-16x9-800.jpg 800w, /img/portraits/{h['id']}-16x9-1280.jpg 1280w" sizes="(min-width: 1100px) 1000px, 100vw" width="1280" height="720" loading="lazy" alt="{e(h['banner_alt'])}"></span>
    </div>

    <section class="wrap section" aria-labelledby="kit-title">
      <div class="section-head">
        <h2 id="kit-title"><span class="title-mark">{e(h['name'])}'s skills</span></h2>
      </div>
      <div class="char-sheet">
        <ul class="skills kit" aria-label="{e(h['name'])}'s skills">
{kit}
        </ul>
      </div>
    </section>

    <section class="wrap section" aria-labelledby="fights-title">
      <div class="section-head">
        <h2 id="fights-title"><span class="title-mark">{e(h['role'] if h['group'] != 'dps' else 'DPS')} in each fight</span></h2>
      </div>
      <div class="char-sheet">
        <ul class="fight-jobs">
{fights}
        </ul>
      </div>
    </section>

    <nav class="wrap section" aria-labelledby="others-title">
      <div class="section-head">
        <h2 id="others-title"><span class="title-mark">The rest of the party</span></h2>
        <a class="more" href="/shatterbound/">All the heroes and bosses</a>
      </div>
      <ul class="party-strip char-others">
          {others_row(h['id'], HEROES)}
      </ul>
    </nav>
  </main>
"""
    page(f"shatterbound/{h['id']}/index.html", dict(
        title=f"{h['name']}, the {h['role']} | Shatterbound | Project Trinity",
        description=f"{h['name']}, the {h['role']} of Project Trinity: Shatterbound. {h['line']}",
        url=f"{SITE}/shatterbound/{h['id']}/",
        og_title=f"{h['name']}, the {h['role']}",
        og_description=h["line"],
        image=f"{SITE}/img/portraits/share-{h['id']}.jpg",
        image_alt=h["banner_alt"],
        current="",
    ), body)


def boss_page(b):
    jobs = boss_jobs(b, level=4)
    body = f"""
  <main id="main" class="page-top">
    <header class="wrap char-head">
      <figure class="char-portrait is-boss">
        {sticker(b['id'], b['painted_alt'], b['render_alt'], eager=True, sizes="(max-width: 760px) 70vw, 340px")}
      </figure>
      <div class="char-words">
        <p class="eyebrow"><a href="/shatterbound/#{b['id']}">The bosses</a> <span aria-hidden="true">/</span> {e(b['place'])}</p>
        <h1><span class="title-mark">{e(b['name'])}</span></h1>
        <p class="lede">{e(b['about'])}</p>
      </div>
    </header>

    <section class="wrap section" aria-labelledby="fight-title">
      <div class="section-head">
        <h2 id="fight-title"><span class="title-mark">How the fight works</span></h2>
      </div>
      <p class="section-lede">Spoilers from here on.</p>
      <div class="char-sheet walk-open">
        {banner(b, sizes="(min-width: 1100px) 860px, 100vw")}
        <ul class="shard-list">
{b['walk']}
        </ul>
        <div>
          <h3 class="jobs-title">Your job</h3>
          <div class="jobs">
{jobs}
          </div>
        </div>
      </div>
    </section>

    <nav class="wrap section" aria-labelledby="others-title">
      <div class="section-head">
        <h2 id="others-title"><span class="title-mark">The other bosses</span></h2>
        <a class="more" href="/shatterbound/">All the heroes and bosses</a>
      </div>
      <ul class="party-strip boss-strip char-others">
          {others_row(b['id'], BOSSES)}
      </ul>
    </nav>
  </main>
"""
    page(f"shatterbound/{b['id']}/index.html", dict(
        title=f"{b['name']} | Shatterbound | Project Trinity",
        description=f"{b['name']}, a boss of Project Trinity: Shatterbound ({b['place']}), and how the fight works.",
        url=f"{SITE}/shatterbound/{b['id']}/",
        og_title=f"{b['name']}: how the fight works",
        og_description=b["about"],
        image=f"{SITE}/img/portraits/share-{b['id']}.jpg",
        image_alt=b["banner_alt"],
        current="",
    ), body)


if __name__ == "__main__":
    shatterbound()
    for h in HEROES:
        hero_page(h)
    for b in BOSSES:
        boss_page(b)
