-- Site 9: the Contact page became "Tell us how it went". Each message now carries what kind it is and the few
-- answers the page asks for; every column is optional, so a row sent before this (or by an older page) stays valid.
--   kind         'bug', 'idea', 'thanks', 'other', or '' when not given
--   ran          did the build run: 'yes', 'trouble', 'no', 'not-played', or ''
--   played       what they played, in their own words (at most 200 characters)
--   severity     how bad, for a bug: 'blocker', 'annoying', 'small', or ''
--   report_code  the game's report code, pasted from the clipboard (UI 136): plain text, one line, at most 1000 characters
ALTER TABLE messages ADD COLUMN kind TEXT NOT NULL DEFAULT '' CHECK (kind IN ('', 'bug', 'idea', 'thanks', 'other'));
ALTER TABLE messages ADD COLUMN ran TEXT NOT NULL DEFAULT '' CHECK (ran IN ('', 'yes', 'trouble', 'no', 'not-played'));
ALTER TABLE messages ADD COLUMN played TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN severity TEXT NOT NULL DEFAULT '' CHECK (severity IN ('', 'blocker', 'annoying', 'small'));
ALTER TABLE messages ADD COLUMN report_code TEXT NOT NULL DEFAULT '';
