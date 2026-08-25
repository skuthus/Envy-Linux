# Agent instructions

This repository is the Linux port of Envy.

1. Read **[PLAN.md](PLAN.md)** all the way through before touching code.
2. Follow it in phase order. Do not skip to packaging, theming, or a public
   download page before the app runs locally against a real Index.
3. Start from [Envy-Windows](https://github.com/skuthus/Envy-Windows), not from
   the macOS Swift app. The Mac repo is the *behavior oracle*, not the codebase
   to compile.
4. Do not expand scope. No Apple Notes, no Continuity Camera, no Live Text, no
   OCR, no new note format, no third trash layout, no rewrite of `envy-core`
   “while we’re here.”
5. Ask the owner before: making the repo public, changing the license, merging
   this with Envy-Windows, or shipping an updater that needs a signing key.
6. Keep commit messages short and factual. Do not force-push `main` after it
   has been pushed.

If PLAN.md and a later chat message conflict, follow the later chat message and
note the conflict in the commit body.
