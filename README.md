# Envy for Linux

A Linux port of [Envy](https://github.com/skuthus/Envy) — a flat-file,
frictionless note-taking application. One search box, instant results, and
notes stored as plain `.md` files.

Open source under the MIT licence. It is the Linux sibling of
[Envy-Windows](https://github.com/skuthus/Envy-Windows): the same Rust
`envy-core`, the same CodeMirror 6 frontend, the same Tauri v2 shell, built
for WebKitGTK instead of WebView2. It is not a rebuild of the macOS Swift app.
The working brief is **[PLAN.md](PLAN.md)**; agents start there.

## Running it (owner's machine: Omarchy / Arch / Hyprland)

Toolchain: Rust stable (`mise use -g rust@stable`), Node 26, and the system
packages `webkit2gtk-4.1 gtk3 librsvg openssl`.

```bash
npm install
./dev.sh                    # hot-reloading dev build
./build.sh                  # headless pre-ship gate, then binary + .deb + AppImage
./linux/install-desktop.sh  # ~/.local/share/applications/envy.desktop → the release binary
```

Notes live in `~/Documents/Envy` by default, created on first launch with a
welcome note; Settings → Change Location… points it at another folder. The
chosen path is the `vault` key of `~/.config/envy/config.md` (see
Configuration below); older installs are migrated from
`~/.config/app.envynote.linux/index-path` on first launch.

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
hidden. While Envy isn't running the eye leaves the bar, unless the menu's
"Show Eye in Bar When Closed" is on (the widget's `showWhenClosed` setting in
`shell.json`), which keeps a dim eye there as a launcher. Left click summons
(or launches) Envy, right click opens the app menu. Underneath it is a StatusNotifierItem Envy registers
itself, drawn as a solid `-symbolic` eye in the bar's text colour, so other
bars (Waybar) show it in their tray; the Omarchy tray widget hides it so it
isn't shown twice.

**Summon.** Wayland has no app-registered global hotkeys, so summon is a
Hyprland bind: `linux/hyprland-envy.lua` binds **Ctrl+Alt+Return** to
`linux/envy-summon.sh`, which runs `envy-linux --toggle`. That hands the verb
to the running instance over its control socket
(`$XDG_RUNTIME_DIR/envy-control.sock`; verbs `toggle`, `show`, `pinned`) and
does exactly what the bar icon's click does, or launches Envy when nothing is
running. Settings → System → "Bind Ctrl+Alt+Return in Hyprland" (the
`system.hyprland_bind` key) adds a guarded `dofile` line for that file to
`~/.config/hypr/bindings.lua` and reloads Hyprland; off removes it. A line you
wrote yourself is left alone, and none is added beside it. The in-app shortcut
settings still exist for X11 / a future portal backend.

**NVIDIA.** WebKitGTK's DMA-BUF renderer aborts the Wayland connection on the
proprietary driver ("Error 71 (Protocol error)" before any window appears).
`src-tauri/src/main.rs` sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` when the
`nvidia` module is loaded; set the variable yourself to override either way.

**Test Index.** `node scripts/gen-test-vault.mjs [dir] [count]` writes a
seeded ~5,500-note vault (tags, task lists, due dates, wiki-links, embeds,
image attachments, subfolders, Inbox, Templates, `.trash`) — default
`~/Envy Test Vault`. It refuses to write into a folder that already holds
notes. Do destructive testing there, never in a synced vault.

**Installing a release.** Omarchy / Arch: `yay -S envy-linux`, launch it,
and turn on Settings → System → "Bind Ctrl+Alt+Return in Hyprland" (or add
`pcall(dofile, "/usr/share/envy/hyprland-envy.lua")` to
`~/.config/hypr/bindings.lua` yourself). Elsewhere, run
the AppImage from the GitHub release. Cutting a release is `scripts/release.sh`;
see RELEASING.md. Envy is MIT licensed (LICENSE).

## Configuration

Everything Envy can be told is in two kinds of file, and the Settings panel
writes the same files, so the GUI and the files never disagree. Both are
markdown with one ` ```toml ` fence, which means they open and edit in Envy
itself. Changes apply live; nothing needs restarting.

`~/.config/envy/config.md` holds every setting. Missing keys mean defaults,
and an unknown key or a bad value is reported rather than fatal.

````markdown
# Envy settings

Edit here or in Settings; both stay in sync.

```toml
vault = "~/Documents/Envy"

[list]
density = "compact"

[shortcuts]
newFromTemplate = "Ctrl+N"
```
````

`~/.config/envy/themes/<name>.md` is one theme. Every colour token is
optional: what you leave out comes from the face underneath, which is the
Omarchy-derived palette in `omarchy` mode and the Envious light or dark face
otherwise. A file named after the current Omarchy theme's slug (the contents
of `~/.local/state/omarchy/current/theme.name`) overlays that theme
automatically, so per-theme tweaks are a few lines rather than a whole
palette. The body is a sample note so the file previews the theme when opened
in Envy.

````markdown
# Tokyo Night, warmer links

```toml
mode = "dark"
link = "#e0af68"
```

A sample note with a [link](https://envynote.app), a #tag and `code`.
````

From the command line:

```bash
envy-linux config check          # validate config.md; exit 1 with the problems
envy-linux config path           # print the config path
envy-linux config edit           # open config.md in Envy (needs it running)
envy-linux theme list            # theme file names, with any problems
envy-linux theme check           # validate every theme file; exit 1 with the problems
envy-linux theme export <name>   # save the theme in use now as themes/<name>.md
```

**The agent skill.** `agents/skills/envy/` teaches an agent all of the above:
the file shapes, every setting key, every re-bindable shortcut, the colour
tokens and the contrast floors. The package installs it to
`/usr/share/envy/agents/skills/envy`, and Envy links it into
`~/.claude/skills/envy` and `~/.agents/skills/envy` at launch when those are
missing or dangling. It never replaces a real directory or a symlink pointing
somewhere else, so linking it by hand is also fine:

```bash
ln -s /usr/share/envy/agents/skills/envy ~/.claude/skills/envy
ln -s ~/Work/Envy-omarchy/agents/skills/envy ~/.agents/skills/envy   # checkout
```

`settings.md` and `shortcuts.md` in that directory are generated from
`config/schema.json` and `src/shortcuts.ts` by
`node scripts/gen-skill-docs.mjs`; `scripts/check.sh` fails if they are stale.

## Structure

- `crates/envy-core` — the note model and store, ported from the Mac
  `EnvyCore`. No UI, no Tauri, no platform assumptions. `cargo test -p envy-core`.
- `src-tauri` — the Tauri v2 shell: windowing, tray, file dialogs.
- `src` — the TypeScript frontend; live markdown styling is CodeMirror 6
  decorations over a plain text buffer.

Built by [Skyler Schoos](https://github.com/skuthus). The macOS original is at
[envynote.app](https://envynote.app).

## License

MIT, the same terms as Omarchy. See [LICENSE](LICENSE).
