# The email list's mail

What Kit sends for projecttrinity.dev, and how hello@projecttrinity.dev becomes a sender inboxes trust (Tooling 192).

| File | What |
|---|---|
| `kit-template.html` | Kit's custom HTML template in the site's Wayfarers' Book look: paper on lilac by Day, blue paper by Night, Caveat Brush titles, Source Sans 3 to read, the gold brush under the name. One column, no images of its own, real text. |
| `words.md` | The confirm email's and the welcome email's words, and where each goes in Kit. |
| `welcome.txt` | The welcome email as its plain-text part should read. |
| `../tools/preview-email.py` | Renders the template with both emails into `email/preview/` (git-ignored) for a look in a browser, light and dark. |

The template follows the reader's dark mode where the mail app lets it (Apple Mail, Outlook on Mac and iOS). Gmail's
apps darken mail their own way and ignore the Night colours; the paper and ink are dark-on-light enough to survive
that. Mail apps that won't load the site's fonts (Gmail, Outlook on Windows) show the titles in Segoe Print or Bradley
Hand and the text in the system sans.

## Promotions: what helps, honestly

Gmail sorts tabs by what a mail looks like and how readers treat that sender, not by anything one setting turns off.
What moves the list towards Primary: a verified sending domain (below), mail that reads like a letter (one column,
mostly text, few links, no banner image, no big buttons), readers who reply or drag a mail to Primary (the welcome
email asks both), and steady, not-too-frequent sending. The template does its part; broadcasts keep it if they stay
text-first with a picture or two. Some readers will still see Promotions: Gmail decides per reader.

## His steps (every click is his)

### 1. Kit: verify projecttrinity.dev as the sending domain

Kit today sends as hello@ but signs with its own domain, which is the main reason Gmail treats it as bulk mail.

1. In Kit: Settings (lower left), Email, Verified Sending Domains, **Set up your Verified Sending Domain**. Enter
   `projecttrinity.dev` (the whole domain; Kit says it touches neither the site nor other mail).
2. Kit shows the records it needs: CNAMEs named like `ckespa` (its SPF) and `cka._domainkey` (and any others it
   lists, DKIM), and a DMARC TXT. Skip **Set this up for me** and add them by hand so nothing else is touched:
3. In Cloudflare: projecttrinity.dev, DNS, Records, **Add record** for each CNAME: Type CNAME, Name exactly as Kit
   shows without the domain (`ckespa`, `cka._domainkey`), Target exactly as Kit shows, **Proxy status: DNS only (grey
   cloud)**. Save.
4. **Do not add Kit's DMARC record**: the domain already has one (`_dmarc`), and two break DMARC. Step 4 below changes
   the one that is there.
5. Back in Kit press **Validate**. It can take a few minutes. If it fails, check a name isn't doubled
   (`ckespa.projecttrinity.dev.projecttrinity.dev`) and the cloud is grey.
6. Kit, Settings, Email: the sending address stays `hello@projecttrinity.dev`, the from name `Project Trinity`.

None of these names clash with what is there or coming: Cloudflare Email Routing's MX and `cf2024-1._domainkey`, the
root SPF, and Tooling 189's Resend records (`send` MX and TXT, `resend._domainkey`). Kit's SPF lives on its own
`ckespa` name, so the root SPF needs no change.

### 2. Kit: the template and the two emails

1. Kit, Send, Email Templates, **+ New Email Template**, **Create HTML Template**. Name it `Project Trinity`. Paste all
   of `kit-template.html`. Save, then **Preview Layout**.
2. Settings (gear) under Account, Email, the physical address: fill it (the template prints it through `{{ address }}`;
   the law asks for one in every mail). Kit lets a sender use Kit's own address if he'd rather not show one.
3. On Email Templates, the three dots on Project Trinity, **Set as default**.
4. The confirm email: Grow, Landing Pages & Forms, the site's form, Settings, Incentive: paste the subject, body and
   button text from `words.md`. If that screen offers a template choice, pick Project Trinity.
5. The welcome email: Send, Sequences, New sequence `Welcome`, one email sent immediately, words from `words.md`,
   template Project Trinity. Then Automate, Visual Automations: when someone subscribes to the site's form, add them to
   Welcome. Publish it.

### 3. Test before the next broadcast

1. Join the list from the site with a Gmail address and an Outlook or Hotmail address. Confirm both.
2. **In Gmail**, open the welcome email, the three dots, **Show original**. The top table should read SPF PASS,
   DKIM PASS and DMARC PASS, and the DKIM line should name `projecttrinity.dev` (not kit.com or convertkit.com).
   Note which tab it landed in.
3. **In Outlook.com**, open it, the three dots, View, **View message source**, and find `Authentication-Results`: it
   should say `spf=pass`, `dkim=pass header.d=projecttrinity.dev`, `dmarc=pass`.
4. Reply to it from one of them: the reply should arrive in the studio Gmail (through the hello@ forward).
5. A tool that scores a whole message: send one to the address https://www.mail-tester.com shows, then open its
   report (aim for 9/10 or better).

### 4. DMARC: tighten once Kit has sent for two weeks

Today `_dmarc` says `v=DMARC1; p=none;`: nobody is told to act on a fake, and no reports come back.

1. Now, in Cloudflare DNS, edit the `_dmarc` TXT to
   `v=DMARC1; p=none; rua=mailto:hello@projecttrinity.dev; adkim=r; aspf=r` so receivers send daily reports to
   hello@ (they arrive as zipped XML; Cloudflare's own DMARC Management, under Email, reads them for you if he turns
   it on, and then gives its own `rua` address to use instead).
2. **Before tightening, check every way mail leaves as @projecttrinity.dev passes.** Today there are four: Kit
   (after step 1), the site's Worker (forms@, signed `cf2024-1`, passes), Resend for build keys (builds@, after
   Tooling 189's verification), and **Gmail's "Send mail as" hello@** (set up 2026-11-25). The last one is the risk:
   Gmail sending as hello@ through Gmail's own servers signs with gmail.com, so it fails DMARC for projecttrinity.dev
   and would go to spam once the policy tightens. In Gmail, Settings, Accounts, "Send mail as": if hello@ shows
   "Mail is sent through: gmail.com" (or no SMTP server), change it to send through an SMTP server that signs for the
   domain. Resend's (Tooling 189) does: SMTP server `smtp.resend.com`, port 465 (SSL), username `resend`, password a
   Resend API key made for sending only. The key is typed into Gmail by him, never written anywhere else.
3. After two clean weeks of reports (only Kit, Cloudflare and Resend sending, all passing): change to
   `v=DMARC1; p=quarantine; pct=100; rua=...` and a month later, if still clean, `p=reject`.

### 5. Optional: tidy the root SPF

The root SPF is `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`. The Google include only matters
if hello@ sends through Gmail's servers, which step 4.2 retires; once Gmail sends through Resend's SMTP, Resend's own
records on `send` cover it. Leave it as it is until then; removing it is harmless after.

## The forward to Gmail (checked 2026-11-26)

Mail to hello@ reaches the studio Gmail through Cloudflare Email Routing. A real forwarded mail's headers (a reply from
a Gmail address to hello@, 2026-11-25) show it working the way forwarding should: Cloudflare rewrote the envelope
sender (SRS, `SRS0=...@projecttrinity.dev`) so SPF passed at Gmail, signed it with projecttrinity.dev's own key
(`cf2024-1`), and sealed the chain (ARC), which Gmail accepted (`arc=pass`); the original sender's DKIM and DMARC still
passed. The forwarding trouble he read of hits senders whose mail is SPF-only with a strict DMARC (their SPF breaks
in any forward); Cloudflare's ARC seal is what Gmail uses to let those through, and Gmail honours Cloudflare's.
Nothing to change. If a real sender's mail ever goes missing, Cloudflare, Email, Email Routing, Activity log shows
whether it was forwarded or dropped.
