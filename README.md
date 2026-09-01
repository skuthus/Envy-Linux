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

Toolchain: Rust stable (via `mise use -g rust@stable`), Node 26, and the
system packages `webkit2gtk-4.1 gtk3 libayatana-appindicator librsvg openssl`.

```bash
npm install
./dev.sh      # hot-reloading dev build
./build.sh    # release binary at target/release/envy-linux, bundles under target/release/bundle/
```

Notes live in `~/Documents/Envy` by default, created on first launch with a
welcome note; point Settings at another folder to use a synced Index.

Desktop integration (a `.desktop` file and a Hyprland scratchpad bind for
summon) lives in `linux/`.

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
