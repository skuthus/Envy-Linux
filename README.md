# Envy for Linux

A Linux port of [Envy](https://github.com/skuthus/Envy) — a flat-file,
frictionless note-taking application. One search box, instant results, and
notes stored as plain `.md` files.

This repository is **private** and proprietary. It is the Linux sibling of
[Envy-Windows](https://github.com/skuthus/Envy-Windows): the same Rust
`envy-core`, the same CodeMirror 6 frontend, the same Tauri v2 shell, built
for WebKitGTK instead of WebView2. It is not a rebuild of the macOS Swift app.
The working brief is **[PLAN.md](PLAN.md)**; agents start there.

## Running it (owner's machine: Omarchy / Arch / Hyprland)

Toolchain: Rust stable (`mise use -g rust@stable`), Node 26, and the system
packages `webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg openssl`.

```bash
npm install
./dev.sh                    # hot-reloading dev build
./build.sh                  # headless pre-ship gate, then binary + .deb + AppImage
./linux/install-desktop.sh  # ~/.local/share/applications/envy.desktop → the release binary
```

Notes live in `~/Documents/Envy` by default, created on first launch with a
welcome note; Settings → Change Location… points it at another folder. The
chosen path is remembered in `~/.config/app.envynote.linux/index-path`.

**Omarchy theme.** This Envy-Omarchy variant follows the current Omarchy
theme (`~/.local/state/omarchy/current/theme/colors.toml`) and the Omarchy
monospace font. Changing `omarchy theme set` or `omarchy font set` retints a
running window. Settings → Appearance can pin Envious light/dark or a custom
font instead. Surfaces are translucent so Hyprland blur shows through.

**Bar icon.** The Mac's menu bar eye is an Omarchy bar widget here. On first
launch Envy installs `linux/omarchy-plugin` into
`~/.config/omarchy/plugins/skuthus.envy/`, enables it, and places it once
(after a hidden-bar chevron if you use one, else at the start of the right
section); move it with `omarchy bar move` and it stays put. Open while the
window is on screen, squinting while only the pinned note is, closed while
hidden or not running. Left click summons (or launches) Envy, right click
opens the app menu. Underneath it is a StatusNotifierItem Envy registers
itself, drawn as a solid `-symbolic` eye in the bar's text colour, so other
bars (Waybar) show it in their tray; the Omarchy tray widget hides it so it
isn't shown twice.

**Summon.** Wayland has no app-registered global hotkeys, so summon is a
Hyprland bind: `linux/hyprland-envy.lua` binds **Ctrl+Alt+Return** to
`linux/envy-summon.sh`, which runs `envy-linux --toggle`. That hands the verb
to the running instance over its control socket
(`$XDG_RUNTIME_DIR/envy-control.sock`; verbs `toggle`, `show`, `pinned`) and
does exactly what the bar icon's click does, or launches Envy when nothing is
running. The owner's `~/.config/hypr/bindings.lua` loads that file with a
guarded `dofile`. The in-app shortcut settings still exist for X11 / a future
portal backend.

**NVIDIA.** WebKitGTK's DMA-BUF renderer aborts the Wayland connection on the
proprietary driver ("Error 71 (Protocol error)" before any window appears).
`src-tauri/src/main.rs` sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` when the
`nvidia` module is loaded; set the variable yourself to override either way.

**Test Index.** `node scripts/gen-test-vault.mjs [dir] [count]` writes a
seeded ~5,500-note vault (tags, task lists, due dates, wiki-links, embeds,
image attachments, subfolders, Inbox, Templates, `.trash`) — default
`~/Envy Test Vault`. It refuses to write into a folder that already holds
notes. Do destructive testing there, never in a synced vault.

**Installing a release.** Omarchy / Arch: `yay -S envy-bin`, then add
`pcall(dofile, "/usr/share/envy/hyprland-envy.lua")` to
`~/.config/hypr/bindings.lua` for the Ctrl+Alt+Return summon. Elsewhere, run
the AppImage from the GitHub release. Cutting a release is `scripts/release.sh`;
see RELEASING.md. Envy is MIT licensed (LICENSE).

## Structure

- `crates/envy-core` — the note model and store, ported from the Mac
  `EnvyCore`. No UI, no Tauri, no platform assumptions. `cargo test -p envy-core`.
- `src-tauri` — the Tauri v2 shell: windowing, tray, file dialogs.
- `src` — the TypeScript frontend; live markdown styling is CodeMirror 6
  decorations over a plain text buffer.

Built by [Skyler Schoos](https://github.com/skuthus). The macOS original is at
[envynote.app](https://envynote.app).

## License

Proprietary. All rights reserved. See [LICENSE](LICENSE).
