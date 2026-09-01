---
name: run-envy
description: Launch and drive Envy (Tauri/WebKitGTK, Hyprland) to see a change working — dev build, window screenshots, keyboard-driven smoke test, and what still needs a human.
---

# Running Envy on the owner's machine (Omarchy / Hyprland / Wayland)

## Fast path

```bash
./scripts/check.sh --quick     # tests, tsc, build, config invariants (no display)
./scripts/gui-smoke.sh         # launches the app, drives it, checks the vault, screenshots
```

For the **full pre-ship gate** — the above plus perf, a real release build, and
the smoke run again through the production CSP and a 19k-note vault — use
`./scripts/ship-check.sh` instead (see the `ship-check` skill). This skill is
for looking at a change while you work on it; ship-check is for deciding it is
done.

`gui-smoke.sh` refuses to run unless the Index is a folder whose path contains
"Test Vault" (make one with `node scripts/gen-test-vault.mjs`, then Settings →
Change Location). It prints PASS/FAIL and leaves screenshots + `dev.log` in
`$XDG_RUNTIME_DIR/envy-smoke/dev/` (one subdirectory per mode). Read
`2-table-and-image.png`: the word "good"
must be underlined, "bad" must be plain text, the image must show.

## Release binary

`cargo build --release` inside `src-tauri/` produces a binary that still tries
to load the Vite dev URL, and with no dev server up the navigation guard
refuses it, so the window comes up blank. Build the real thing with
`npm run tauri build -- --no-bundle` (about 40 s) and run
`./target/release/envy-linux`. `./build.sh` is the same plus .deb/AppImage.
`./scripts/gui-smoke.sh --release` drives that binary (and refuses if it is
older than `src/` or `src-tauri/src/`); `--big-vault [path]` points the Index at
a large vault for a paging pass and always restores it afterwards.
The release build has its own localStorage origin, so settings such as list
previews differ from the dev build until you set them there too.

## Doing it by hand

- Launch: `nohup npm run tauri dev > dev.log 2>&1 &` — first Rust build takes
  a few minutes; later ones ~5s. The window class is `envy-linux`.
- Wait/locate: `hyprctl clients -j | jq '.[]|select(.class=="envy-linux")|{at,size}'`
- Focus: `hyprctl dispatch 'hl.dsp.focus({window="class:envy-linux"})'` — this
  Hyprland takes Lua, not the classic `focuswindow class:x` form, and prints a
  warning instead of failing; confirm with `hyprctl activewindow -j | jq .class`.
- Screenshot: `grim -g "X,Y WxH" shot.png` with the numbers from `at`/`size`,
  then Read the PNG and look at it.
- Don't send more than ~20 keys/s: the app opens a note on every arrow press
  (~35 ms each at 19k notes) and faster input queues up, so a screenshot taken
  right after shows the highlight still moving. Ctrl+Alt+P collides with
  fcitx5's toggle-preedit binding, so pin cannot be tested from the keyboard.
- Type: `wtype "text"`, keys `wtype -k Return`, chords `wtype -M ctrl l -m ctrl`.
  Search box: Ctrl+L; clear it: Alt+Backspace; Return opens the top match or
  creates the note and focuses the editor. `template:Name` + Return opens a
  template for editing. Ctrl+Backspace deletes the open note (to `.trash`).
- Don't type markdown tables through wtype — the editor auto-inserts pipes and
  the table comes out doubled. Write the `.md` file straight into the vault;
  the watcher reloads it within ~2s.
- Stop: `pkill -x envy-linux`, then kill the `npm run tauri dev` job (it is the parent of the CLI, vite and cargo).

## Not automatable here

There is no Wayland click tool installed (no ydotool/wlrctl), so anything
behind a mouse click or the tray menu needs the owner: **pop-out windows**
(right-click a note → Pop Out) and the **pinned-note window** (Ctrl+Alt+T
pins; the tray menu shows it). Both share the main window's navigation guard
and capabilities, so ask for a manual check when those change.
