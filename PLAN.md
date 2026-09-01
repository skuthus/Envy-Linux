# Envy-Linux — agent plan

A coding agent should be able to execute this document without the original
conversation. Read it whole, then work in phase order. Stop at the end of a
phase if something product-level is undecided; do not invent a third architecture.

**Owner:** Skyler Schoos (`skuthus`)
**This repo:** private `skuthus/Envy-Linux`
**Goal:** a Linux daily driver of Envy that opens the same flat-file Index as
the Mac and Windows apps, on Omarchy (Arch Linux + Hyprland).

---

## 1. What you are building

Envy is a Notational-Velocity-style notes app: one search box, instant
filter-as-you-type, Return opens the top match or creates a note from the
query, notes are plain `.md` files in one folder called The Index.

There are already two implementations:

| App | Repo | Stack |
|---|---|---|
| macOS original | https://github.com/skuthus/Envy | Swift 6 / SwiftUI / AppKit, `EnvyCore` |
| Windows port | https://github.com/skuthus/Envy-Windows | Tauri v2 + Rust `envy-core` + TypeScript/CodeMirror 6 |

**Linux is a third skin of the Windows port, not a port of the Mac app.**

The Windows README already states the split: `envy-core` is platform-agnostic
Rust; the UI is CodeMirror 6 decorations over a plain text buffer; the shell is
Tauri v2 (window, tray, global shortcut, dialogs, updater). Tauri has a Linux
target. That is the whole reason this path is cheaper than touching Swift.

v1 success is: `cargo tauri dev` on this machine, search / create / edit /
wiki-link / trash against a real Index, plus a `.desktop` file and a Hyprland
scratchpad bind for summon. Not feature-parity theatre. Not a public download
page.

---

## 2. Hard rules

1. **Copy Envy-Windows. Do not compile the Swift app.** SwiftUI/AppKit do not
   exist here. `MarkdownTextView.swift` is not your problem.

2. **`envy-core` behavior stays Windows/Mac-aligned.** Notes may be synced
   across machines. A note that means one thing on Linux and another on
   Windows is a data bug. Where the Mac is “wrong but harmless,” Windows
   reproduced it (`due::parse_flexible_date` is the canonical example). Keep
   doing that.

3. **Do not invent a third trash layout.**
   - Mac: vault-root `Trash/` (`Trash/Work/x.md`)
   - Windows: per-folder `.trash` (`Work/.trash/x.md`)
   Linux copies **Windows** (`.trash`). Document the Mac mismatch; do not
   “fix” it into a third scheme. Migrating Mac `Trash/` onto Linux is out of
   scope unless the owner asks.

4. **Keep Windows filename sanitization** in `crates/envy-core/src/filename.rs`.
   Linux allows `? * < > |` etc. in names; Windows does not. Loosening the
   sanitizer makes notes that cannot round-trip to Windows. Leave it strict.

5. **Do not rewrite the editor.** Live markdown is already CodeMirror 6 in
   `src/styler.ts`. Fix WebKitGTK bugs; do not replace CodeMirror with
   GtkSourceView, ProseMirror, or a custom engine.

6. **Do not add Mac-only features Windows already dropped:** Apple Notes
   import, Continuity Camera, VisionKit Live Text, OCR, AeroSpace, the Mac
   theme gallery (Windows has not built it either).

7. **This repo stays private and proprietary** unless the owner says otherwise.
   Same LICENSE as the other Envy repos. Do not publish to Flathub, AUR, or
   a public GitHub repo on your own.

8. **Do not copy the Windows updater signing private key into this repo.**
   It must never land in git. Linux updater is a later phase; a private GitHub
   repo also cannot serve `releases/latest/download/latest.json` to an
   unauthenticated updater.

9. **Do not force-push `main` after the first push.**

10. **One concern per commit** once code exists. Phase 0 may be one “import
    Envy-Windows” commit.

---

## 3. Sources of truth

Consult in this order when behavior is unclear:

1. **This file** for Linux-specific decisions.
2. **Envy-Windows source** for how the Tauri app actually works.
3. **macOS Envy** (`Sources/EnvyCore`, `Sources/EnvySelfCheck`) for what a
   note/search/wiki-link *means*. The Windows port’s rule is “match the Mac
   exactly”; Linux inherits that.
4. The owner, if those conflict.

Do not scrape envynote.app for implementation details.

---

## 4. Architecture you are copying

After Phase 0 the tree should look like Envy-Windows:

```
crates/envy-core/          # notes, search, due dates, store, watcher, trash
crates/icon-generator/
src-tauri/                 # Tauri shell — almost all Linux work lives here
  src/lib.rs               # commands, tray, hotkeys, updater, reveal-in-folder
  src/main.rs
  tauri.conf.json
  capabilities/
src/                       # TypeScript frontend — mostly keep as-is
  main.ts, styler.ts, styles.css, shortcuts.ts, …
index.html, pinned.html, popout.html
```

`envy-core` already uses:

- `notify` for folder watching (Linux backend: inotify)
- `trash` crate for emptying into the real OS trash (Linux: XDG Trash)
- `dirs` / `dunce` for paths (`dunce` is a Windows UNC helper; harmless here)
- `fancy-regex` so look-around patterns match the Mac source

The frontend already uses Ctrl as the Command equivalent. **Keep Ctrl.** Do
not remap the default shortcuts to Super. Linux users who want Super can
remap; Hyprland summon will be a compositor bind anyway.

---

## 5. This machine (facts, not guesses)

The owner’s daily Linux box is Omarchy: Arch, Hyprland, Wayland.

Already installed when this plan was written (verify; install only what is
missing):

- `rustc` / `cargo` 1.98.0
- Node.js v25 / npm 11
- `webkit2gtk-4.1`
- `gtk3`
- `libayatana-appindicator`
- `librsvg`
- `openssl`

Tauri 2 on Linux typically wants WebKitGTK **4.1**, not 6.0. This box has 4.1.

If a build fails on missing packages, the usual extra set is:

```text
base-devel webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg openssl appmenu-gtk-module
```

Use `pacman`. Do not introduce apt, nix, or distrobox “to be portable.”

Default Index path: `dirs::document_dir().join("Envy")` → `~/Documents/Envy`.
The owner may already have notes there, or may point Settings at a synced
copy of the Mac Index. Never delete, migrate, or rewrite files in an existing
Index as a “setup step.”

---

## 6. Work, in order

### Phase 0 — Bootstrap the code into this repo

This repo currently contains only `README.md`, `PLAN.md`, `AGENTS.md`, and
`LICENSE`.

1. Clone https://github.com/skuthus/Envy-Windows into a temp directory.
2. Copy its contents **into this repo**, excluding:
   - `.git/`
   - `target/`, `node_modules/`, `dist/`
   - any updater private key files (`*.key`, `tauri.key`, etc.)
3. Keep the existing `PLAN.md`, `AGENTS.md`, and this `LICENSE` (they should
   match). Overwrite Windows `README.md` with a Linux README that still points
   at PLAN.md and says this is a port of Envy-Windows.
4. Rewrite identity strings:
   - `package.json` name: `envy-linux`
   - `src-tauri/Cargo.toml` package name: `envy-linux` (lib name
     `envy_linux_lib` is fine)
   - `src-tauri/tauri.conf.json`:
     - `identifier`: `app.envynote.linux`
     - `productName` can stay `Envy`
     - updater `endpoints` / `pubkey`: **remove or leave inert** until Phase 6.
       Do not point Linux builds at the Windows `latest.json`.
   - Bundle targets: start with `"deb"` and `"appimage"` in mind; do not leave
     NSIS/MSI as the implied default once you touch `bundle.targets`.
5. Add `dev.sh` and `build.sh` equivalents of `dev.cmd` / `build.cmd`. You may
   delete the `.cmd` files. Use `#!/usr/bin/env bash` and `set -euo pipefail`.
6. Single commit: `Import Envy-Windows as the Linux starting point.`
7. `npm install`. Commit `package-lock.json` only if it changed for a real
   reason; prefer not to churn it.

Do not start rewriting `lib.rs` in the same commit as the import.

### Phase 1 — Make it compile on Linux

Goal: `cargo test -p envy-core` passes, and `npm run tauri build` (or
`cargo tauri dev`) gets as far as linking.

1. Run `cargo test -p envy-core` immediately. It should already pass; it has
   no Win32 in the crate. If it fails, fix `envy-core` first — that is a
   portability bug, not a UI bug.
2. In `src-tauri/Cargo.toml`, make the `windows` crate Windows-only:

   ```toml
   [target.'cfg(windows)'.dependencies]
   windows = { version = "0.61", features = ["Win32_Foundation", "Win32_UI_WindowsAndMessaging"] }
   ```

3. In `src-tauri/src/lib.rs`, gate every Win32 use:
   - `lower_below_foreground` (HWND / `SetWindowPos`) — `#[cfg(windows)]`.
     On Linux, `apply_keep_on_top` should only call Tauri’s
     `set_always_on_top`. Compositors own z-order.
   - `reveal_path` / Explorer `raw_arg` — see Phase 2.
   - `launch_installer_after_exit` (cmd.exe / NSIS) — `#[cfg(windows)]`.
     Linux updater, if any, is Phase 6.
   - `std::os::windows::process::CommandExt` — already some `#[cfg(windows)]`;
     find every remaining use.
4. `src-tauri/src/main.rs` already has
   `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]`.
   Leave it; it is a no-op on Linux.
5. Fix any `cfg(windows)` assumptions in frontend TypeScript only if they
   **break the build**. Cosmetic “Explorer” strings are Phase 2/4.
6. First Linux build will take several minutes. When it fails, read the
   linker error: missing `webkit2gtk-4.1` vs GTK vs appindicator are the
   usual three.

Acceptance: `cargo test -p envy-core` green; `npm run tauri build` produces a
binary under `target/release/` (name will follow the Cargo package). The
window does not have to look good yet.

### Phase 2 — Replace Windows OS edges

All of this is `src-tauri/src/lib.rs` plus a few UI strings.

#### 2a. Reveal in file manager

Windows: `explorer /select,"<path>"` via `raw_arg`.

Linux replacement, in order of preference:

1. Try the FreeDesktop File Manager DBus interface (`org.freedesktop.FileManager1.ShowItems`)
   so the file is selected, not just the folder opened.
2. Fall back to `xdg-open` on the parent directory.

Do not shell out to `nautilus`, `thunar`, `dolphin`, or `nemo` by name.
Do not call `explorer`.

Frontend strings in `src/main.ts` (and context menus): change
“Reveal in Explorer” / “Show in Explorer” to **“Show in Folder”**. Recycle Bin
copy → **“Trash”** (XDG), not “Recycle Bin.”

#### 2b. Keep on top

- Persist and `set_always_on_top` as today.
- Skip `lower_below_foreground` on Linux.
- Do not fight Hyprland for layering. If always-on-top is weird under
  tiling, document it; don’t add compositor-specific hacks in v1.

#### 2c. Taskbar / skip-taskbar

`set_skip_taskbar` may no-op or misbehave on Wayland. Keep the setting; if it
does nothing, that is acceptable for v1. Do not build a custom dock icon
protocol.

#### 2d. Autostart

`tauri-plugin-autostart` writes an XDG `.desktop` on Linux. Verify it lands
in `~/.config/autostart/` when enabled. That is the correct Linux mechanism.
Do not add a systemd user unit on top.

#### 2e. Open paths / URLs

`tauri-plugin-opener` (`open_url`, `open_path`) should work. Test
`open_external_url` and `open_attachment`. If opener fails on this desktop,
`xdg-open` is the fallback — only if opener actually fails.

#### 2f. Global shortcuts (in-app)

`tauri-plugin-global-shortcut` will likely **fail or be unreliable on
Hyprland/Wayland**. Required handling:

- If registration fails, log it and continue launching. **Never refuse to
  start** because summon could not be grabbed.
- Keep the command and Settings UI so X11 or a future portal backend can
  work.
- Treat “summon from anywhere” as a **Hyprland bind** (Phase 5), not as a
  v1 blocker.

Acceptance: reveal-in-folder opens the Index; autostart toggle writes a
desktop file; the app starts even when global shortcut registration errors.

### Phase 3 — First real run against an Index

1. `npm run tauri dev` (or `./dev.sh`).
2. Confirm it creates `~/Documents/Envy` and a welcome note **only if that
   folder does not already exist / is empty**. If the owner already has an
   Index there, use it. Do not overwrite `Welcome to Envy.md` if present.
3. Manually verify:
   - Type in search, list filters
   - Return on no match creates a note
   - Edit, wait, confirm the `.md` file on disk
   - Edit that file in another editor, confirm Envy reloads (inotify + 400ms
     debounce in `crates/envy-core/src/watcher.rs`)
   - `[[WikiLink]]` Ctrl-click opens/creates
   - Delete → `.trash`; restore
   - Templates folder
4. Watcher notes for Linux:
   - inotify is not recursive at the kernel; `notify` watches each
     subdirectory. A vault with huge folder fan-out can hit
     `fs.inotify.max_user_watches`. If reload silently dies, that is why.
   - Flat Indexes (Envy’s default shape) are fine.
   - Metadata events are already ignored; keep that filter.

If search, create, save, reload, wiki-link, and trash work, Phase 3 is done
even if the chrome looks Windows-y.

### Phase 4 — WebKitGTK pass

Linux Tauri uses WebKitGTK, not WebView2. CodeMirror will run; details will
not.

Walk this list against a real window. Fix only what you can see:

- Fonts: `src/styles.css` currently prefers `'Segoe UI Variable Text',
  'Segoe UI'` and `'Cascadia Code', Consolas`. Change the UI stack to
  `system-ui, sans-serif` and the mono stack to `ui-monospace, monospace`
  (Inter / the Omarchy default will then apply). Do not bundle Segoe.
- Scrollbars: `::-webkit-scrollbar` rules exist; confirm they still apply.
- Clicks on wiki-links, due-date pills, tags, checkboxes, URL pills
- Embeds `![[Note]]` and image attachments
- IME / dead keys if you can type them
- Settings modal, prompt modal, image picker
- Pinned popover and pop-out windows (`pinned.html`, `popout.html`)
- Drag regions (`-webkit-app-region`) — may do nothing under Wayland
  client-side decorations; acceptable
- Backdrop / blur: do not block v1 on visual-effect parity

Do not “clean up” CSS that still works. Do not introduce a design refresh.

### Phase 5 — Desktop integration (Omarchy / Hyprland)

This is how summon actually works on the owner’s machine.

1. Install a `.desktop` file (Name=Envy, Exec=the debug or release binary,
   Icon=the existing PNG, `StartupWMClass` matching the Tauri / GTK class —
   **measure it** with `hyprctl clients` while the app is focused; do not
   guess). During development it can live in `~/.local/share/applications/`.
   For a bundled build, Tauri’s deb should install it.
2. Tray: Omarchy’s bar is a StatusNotifier host. Test left-click show/hide
   and the tray menu. If click-to-toggle is flaky on Wayland, keep the menu
   items and document the click bug; do not spend a week on tray protocols.
3. Write a **Hyprland snippet** (a small `hyprland-envy.conf` in this repo,
   not a silent edit of the owner’s `~/.config/hypr/` unless they ask):

   Suggested shape (adjust class after measuring):

   ```conf
   # Summon Envy: scratchpad toggle. Bind whatever chord the owner wants;
   # Ctrl+Alt+Return matches the Windows default.
   bind = CTRL ALT, RETURN, exec, hyprctl dispatch togglespecialworkspace envy
   windowrulev2 = workspace special:envy, class:^(Envy)$
   ```

   If a scratchpad is the wrong fit (owner wants a normal tiled window),
   fall back to `hyprctl dispatch focuswindow class:Envy` plus exec if not
   running. Ask rather than overwriting their window manager config.

4. Do not add `AeroSpaceInterop`-style socket code for Hyprland in v1. The
   bind *is* the integration.

### Phase 6 — Packaging (personal, not public)

Priority for the owner: a binary they can run without `tauri dev`.

1. `npm run tauri build` → AppImage and/or the raw executable.
2. A local `.desktop` + icon pointing at that binary is enough to daily-drive.
3. Deb is nice-to-have. AUR / Flathub / pacman repo are **out of scope**.
4. Updater:
   - Do not wire `tauri-plugin-updater` to the Windows GitHub releases.
   - Do not generate a new updater key and bake it in “for later” without
     the owner putting the private key in a password manager first.
     (Windows `RELEASING.md`: lose the key, every install is stranded.)
   - Because this GitHub repo is **private**, a GitHub `latest.json` URL
     will not work for an unauthenticated updater anyway.
   - v1 daily driver: no auto-update. Rebuild when you want a new build.

Rewrite `RELEASING.md` for Linux only after the owner asks for a public
channel. Until then, delete or stub the Windows NSIS/MSI instructions so
nobody follows them here.

### Phase 7 — Only if Phases 0–5 are done

Optional, owner-approved:

- Case-sensitivity tests in `envy-core`: `Note.md` vs `note.md` on ext4.
  Detect collisions; do not silently overwrite.
- Unicode filename normalization (NFC vs NFD) if a Mac-synced Index shows
  duplicate titles.
- Theme gallery (not on Windows yet — do not start it here).
- One shared Tauri repo for Windows+Linux instead of two. That is a later
  product decision, not a refactor to sneak in.

---

## 7. File-by-file change map

| Path | What to do |
|---|---|
| `crates/envy-core/**` | Leave behavior alone. Tests must stay green. Watcher comments mention Windows Search Indexer; add a Linux inotify note, don’t change filters unless a real bug appears. |
| `crates/envy-core/src/filename.rs` | Do not loosen. |
| `crates/envy-core/src/store.rs` | Keep `.trash`. Keep `trash::delete` for empty-trash. |
| `src-tauri/Cargo.toml` | Rename package; gate `windows` crate. |
| `src-tauri/src/main.rs` | Leave cfg windows_subsystem. |
| `src-tauri/src/lib.rs` | Main Linux work: reveal, keep-on-top, installer, identity comments. |
| `src-tauri/tauri.conf.json` | identifier, updater, bundle targets. |
| `src-tauri/capabilities/*` | Leave unless a Linux permission actually fails. |
| `src/main.ts` | Explorer/Recycle Bin strings; no Ctrl→Super remap. |
| `src/styles.css` | Font stacks only, plus WebKit bugs you can reproduce. |
| `src/styler.ts`, `src/shortcuts.ts`, other `src/*` | Touch only for WebKit regressions. |
| `dev.cmd` / `build.cmd` | Replace with `dev.sh` / `build.sh`. |
| `RELEASING.md` | Stub or rewrite; do not keep NSIS steps as gospel. |
| Windows Store logos under `src-tauri/icons/` | Harmless; keep. Need a Linux `.png` for the desktop file (already have `icon.png`). |

---

## 8. Vault contract (do not break)

An Index is a directory of `.md` files plus:

| Entry | Role |
|---|---|
| `*.md` at any included depth | notes; title = filename stem |
| `Templates/` | templates, not notes |
| `Attachments/` | images and other binaries |
| `.trash/` (per folder, Windows layout) | soft-deleted notes |
| `Inbox/` | fleeting notes, if used |

Wiki-links: `[[Title]]`. Embeds: `![[Title]]`. Tags: `#tag`. Due: `@04-16-26`,
`@today`, `@monday`. Search operators must keep matching Windows/Mac
(`tag:`, `due:`, `trash:`, `template:`, `stale:`, scattered words, comma OR).

Rename rewrites `[[links]]` and `![[embeds]]` across the vault. That logic
is in `envy-core`; do not reimplement it in TypeScript.

---

## 9. Testing

Automated:

```bash
cargo test -p envy-core
```

That is the regression net. Do not skip it. Do not delete tests that look
Windows-named (`create_sanitizes_a_windows_illegal_title` is load-bearing
for cross-platform sync).

There is no Envy-Windows equivalent of `EnvySelfCheck` as a separate binary;
`envy-core` unit tests are the stand-in.

Manual (Phase 3 checklist) is mandatory before calling v1 done. Use a
**throwaway Index** (`/tmp/envy-index-test`) for destructive tests. Do not
run empty-trash experiments on the owner’s real notes.

---

## 10. Definition of done (v1)

All of these:

- [ ] Envy-Windows tree imported; identity strings are Linux
- [ ] `cargo test -p envy-core` passes on this machine
- [ ] App launches under Hyprland via `tauri dev` and via a release binary
- [ ] Search, create, save, external reload, wiki-link, delete/restore work
  against a real folder of `.md` files
- [ ] “Show in Folder” opens a file manager
- [ ] Autostart toggle writes XDG autostart
- [ ] Global shortcut failure does not prevent launch
- [ ] A `.desktop` file exists; a Hyprland snippet for summon is in the repo
- [ ] Fonts do not request Segoe / Cascadia as the primary family
- [ ] No updater private key in git
- [ ] README describes how *the owner* runs it, not how strangers build it

Not required for v1:

- Public releases, code signing, Sparkle/Tauri updater
- Theme gallery, OCR, Apple Notes, Continuity
- Perfect tray click behavior
- In-process global hotkeys on Wayland
- Pixel parity with macOS vibrancy/blur
- Flatpak sandboxing
- Matching the Mac `Trash/` folder layout

---

## 11. Pitfalls (read before debugging for an hour)

- **Wayland global hotkeys are a compositor feature.** If summon “doesn’t
  work,” check Hyprland binds before the Rust plugin.
- **Private GitHub + Tauri updater = 404.** Do not debug signature
  verification until the endpoint is actually public or authenticated.
- **inotify watch limit** on a huge nested vault, not on 15k files in one
  directory.
- **Case-sensitive disk.** A Mac Index with `Note.md` and `note.md` as the
  “same” note can appear as two notes here. Don’t auto-merge.
- **NFC/NFD.** Mac often stores NFD filenames; Linux usually NFC. Two
  files that look identical in the list may be distinct bytes.
- **Do not `sudo` the app.** Notes live in the home directory.
- **Do not enable Tauri CSP experiments** (`csp` is already `null` on
  Windows). Leave it.
- **WebKitGTK is not Chromium.** `window.chrome`, WebView2-only APIs, and
  some CSS will just be missing. Feature-detect; don’t UA-hack.

---

## 12. How to communicate

When you finish a phase, say what you ran and what still fails. Do not open
a PR onto Envy-Windows. This repo is the Linux line.

If you need a product decision, ask. The only likely ones:

- Scratchpad vs ordinary tiled window for summon
- Whether to daily-drive `~/Documents/Envy` or a separate test Index
- Whether Windows and Linux should ever become one repository

Until told otherwise: scratchpad snippet in-repo (don’t edit hypr config),
throwaway Index for tests, keep the repos separate.

---

## 13. Status and deviations (2026-08-31)

Phases 0–6 are done; the owner's later chat decisions override this plan where
they differ, per AGENTS.md. What changed from the text above:

- **Parity target widened.** The owner asked for macOS **1.11.1** parity (not
  Windows-level v1), minus Apple-only features, plus **Kindle import from a
  USB-mounted Kindle only** (no Moorage/MTP). An audit found Envy-Windows was
  already at ~1.8.8, not 1.7.0; the remaining gaps were ported: Kindle import
  (`crates/envy-core/src/kindle.rs`, `src/kindle.ts`), Enable-Inbox toggle,
  path-traversal hardening, sticky pinned strip, search jump-to-match,
  move-collision refusal + submit-into-folder + bulk move, born-coloured
  folders, `*`→`**|**` pairing, inline caption/width editing, ghost completion
  in secondary windows, peek pin button, pop-out size memory, title fades,
  vector checkbox, and the small 1.8.8/1.8.1 fixes.
- **Two Mac alignments that also change Windows-inherited behaviour:**
  duplicate filenames now disambiguate as `Name (2)` (Mac shape; Windows had
  `Name 2`), and a visible vault-root `Trash/` plus `Envy Data/` are treated
  as service folders (excluded from notes, folders and move targets) so a
  Mac-synced Index does not show its trash as live notes. The Linux trash
  itself is still per-folder `.trash/` (§2 rule 3 unchanged).
- **WebKitGTK on NVIDIA.** The first launch died with Wayland
  `Error 71 (Protocol error)`; `src-tauri/src/main.rs` sets
  `WEBKIT_DISABLE_DMABUF_RENDERER=1` when the `nvidia` module is loaded.
- **Toolchain facts (§5) were wrong:** Rust was not installed (now via
  `mise use -g rust@stable`); `~/Documents` is a symlink to
  `/mnt/storage/Documents` with no owner-write bit, so the generated test
  Index lives at `~/Envy Test Vault` (`scripts/gen-test-vault.mjs`).
- **Hyprland (§5/§6 Phase 5):** this Hyprland uses Omarchy's Lua config;
  `hyprctl dispatch` takes Lua (`hl.dsp.focus({ window = 'address:…' })`,
  `hl.dsp.workspace.toggle_special('envy')`). The summon bind lives in
  `linux/hyprland-envy.lua` and is loaded from the owner's `bindings.lua`
  with a guarded `dofile` (owner approved editing it). Window class measured:
  `envy-linux`; the rule matches class + title `^Envy$` so pop-outs stay
  ordinary windows.
- **Packaging (Phase 6):** `.deb` and AppImage both build; AppImage needs
  `NO_STRIP=true` (set in `build.sh`) because linuxdeploy's bundled `strip`
  rejects `.relr.dyn` sections. Updater stays Windows-only (`cfg(windows)`).
- **Not verified in-app yet (keyboard-driven harness could not click):**
  Ctrl-click on a `[[wiki-link]]`, autostart toggle writing
  `~/.config/autostart/`, tray left-click toggle, Kindle import end to end.
