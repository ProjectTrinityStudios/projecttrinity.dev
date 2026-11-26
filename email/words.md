# The list's two emails

Kit sends two emails to someone who joins: the confirm email (Kit calls it the form's incentive email, the double
opt-in) and the welcome email (the first email of a sequence that starts when someone confirms). These are their words,
in the studio's voice and the game's player voice: plain, warm, short, no em dash. Paste them into Kit's editor as
text; the template (`kit-template.html`) gives them the Book look.

Short, personal-sounding text with few links and no big images is what keeps a mail looking like a letter rather than
an advert. Each email below has two or three links at most.

## The confirm email

Where: Kit, Grow, Landing Pages & Forms, the site's form, Settings, Incentive, Email.

- **Subject:** Confirm your spot on the Project Trinity list
- **Preview text:** One press and you're in. If this wasn't you, ignore it.
- **Body:**

  > Hi,
  >
  > Someone asked to join the Project Trinity: Shatterbound email list with this address. If that was you, press the
  > button and you're on it.
  >
  > [Confirm and join]
  >
  > If it wasn't you, ignore this email and nothing happens. You won't hear from the list again.
  >
  > Project Trinity Studios

- **Button text:** Confirm and join
- **After confirming, send them to:** `https://projecttrinity.dev/?subscribed=1` (the site's own "You're on the list"
  note; this is already the setting if the welcome note shows today).

## The welcome email

Where: Kit, Send, Sequences, a sequence named "Welcome" with one email sent immediately, and an automation (Automate,
Visual Automations: when someone joins the site's form, add to the Welcome sequence). Pick the Project Trinity template
in the email's template setting.

- **Subject:** You're on the Project Trinity list
- **Preview text:** What's coming, and one question for you.
- **Body:**

  > ## Welcome to the party
  >
  > Thanks for joining. Project Trinity: Shatterbound is a dungeon crawler built around the tank, healer and DPS of MMO
  > raiding: four heroes, MMO-style bosses with telegraphed mechanics, and an AI party that plays the members you
  > aren't. You can swap into any of them mid-fight.
  >
  > Here's what to expect: a note when there's a new devlog post or a new build to try. Not often, and every email
  > has a way out at the bottom.
  >
  > While you wait, the newest post is [Meet Project Trinity: Shatterbound](https://projecttrinity.dev/devlog/i-miss-playing-with-my-friends/),
  > and the heroes and bosses are on [the Shatterbound page](https://projecttrinity.dev/shatterbound/).
  >
  > One question: which hero would you play first, Bastion the tank, Oracle the healer, or Reaver or Asha on damage?
  > Just reply. Every reply is read.
  >
  > Project Trinity Studios
  >
  > P.S. If this landed in Promotions or Updates, drag it to your Primary inbox so the next one finds you.

The plain-text version Kit sends beside the HTML is made by Kit from the same words. `welcome.txt` is the text as it
should read there, for checking Kit's preview.

## Why these choices

- **A reply question.** Replies are the strongest sign to Gmail that a sender is a person someone talks to, and it
  moves the next mail towards Primary. The question is about the game, so it is easy to answer.
- **The P.S.** One drag teaches Gmail where the list belongs for that reader. It is a request, so it comes last.
- **Few links, no hero image.** Images, many links and big buttons are what Gmail's tab sorting reads as marketing.
  The confirm email has one button (Kit's); the welcome email two links in its text.
