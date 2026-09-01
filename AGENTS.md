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

## Before shipping

Run **`./scripts/ship-check.sh`** after any significant change, and always
before `./build.sh`. While iterating, `--quick` (checks + the dev GUI smoke) is
enough; run the full gate before you call something done. `--no-gui` is the
headless subset for a machine with no display, and `./build.sh` runs that
headless gate itself before it bundles anything (`ENVY_SKIP_GATE=1` overrides).

What the steps prove:

| step | proves |
| --- | --- |
| `check` | tests, types, frontend build, audits, and the security invariants a refactor could quietly undo (CSP intact, capability permissions inside the allowlist, no string-to-HTML in `src/`); `./scripts/check.sh --self-test` breaks each invariant in a scratch copy and proves it still bites |
| `perf` | search and index timings still match `scripts/perf-baseline.json` |
| `release-build` | `npm run tauri build -- --no-bundle` links — the only build that is really configured for production |
| `gui-dev` | the app runs and the vault round-trip works: save, watcher, templates, delete-to-trash |
| `gui-release` | the same through the **real** CSP; the dev build uses `devCsp`, so this is the only step that can catch a CSP regression |
| `gui-big` | 19k notes: paging does not blank the window or wedge search |

The GUI steps need the owner's display (Hyprland/Wayland, `grim` + `wtype`) and
an Index whose path contains "Test Vault" — they write into it. They refuse to
run if Envy is already open. Only PASS/FAIL/SKIP and timings are printed; the
per-step logs are in `$XDG_RUNTIME_DIR/envy-ship/`. `gui-big` needs a large
vault at `~/.cache/envy-bench/vault20k` (or `ENVY_BIG_VAULT`); it SKIPs, and
says so, if there isn't one.

Three things the gate still cannot see, so ask the owner to check them by hand
when they change: **pin behaviour while the list is paging**, the **sort
header**, and the **pop-out and pinned-note windows** (both need a mouse click,
and there is no Wayland click tool on this machine).
