# Releasing Envy for Linux

The source is public (MIT). A release is a git tag, a GitHub release with
the assets, and an AUR package that installs from them.

## What a release is

- **Tag** `v<version>`, where `<version>` is `src-tauri/tauri.conf.json`'s
  version (for example `1.0.0`). The Linux port has its own version line: it
  tracks the Mac app's features, not its number.
- **Tarball** `envy-linux-<version>-x86_64.tar.gz`: the release binary, the
  desktop entry, icons, the Hyprland bind file and its summon script, the
  `agents/skills/envy` skill, the README and LICENSE. This is what the AUR
  package installs; `linux/PKGBUILD` copies exactly that tree into `/usr`, so
  the skill lands at `/usr/share/envy/agents/skills/envy` where Envy links it
  into `~/.claude/skills` and `~/.agents/skills` at launch.
- **AppImage**, for people not on Arch.

## Cutting one

1. Bump the version in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`
   and `_tauriver` in `linux/PKGBUILD`. Commit.
2. `scripts/release.sh --dry-run` — runs the ship gate through `build.sh`,
   builds, assembles the tarball, and proves `linux/PKGBUILD` packages it
   with a local `makepkg`. Read what it prints.
3. `scripts/release.sh` — the same, then tags, pushes the tag, and creates
   the GitHub release with `gh`.
4. Publish the AUR package: in your AUR checkout of `envy-linux`, update
   `_tauriver` and paste the sha256 the script printed into `sha256sums`,
   regenerate `.SRCINFO` (`makepkg --printsrcinfo > .SRCINFO`), commit, push.
   Omarchy users then get the update through `yay -Syu`.

The repo copy of `linux/PKGBUILD` keeps `sha256sums=('SKIP')` on purpose: it
is the template and the local-test harness, not the published package.

## Installing

- Omarchy / Arch: `yay -S envy-linux`, launch it, and turn on Settings →
  System → "Bind Ctrl+Alt+Return in Hyprland", which adds the
  `pcall(dofile, "/usr/share/envy/hyprland-envy.lua")` line to
  `~/.config/hypr/bindings.lua` and reloads Hyprland (or add it by hand).
  The bar widget installs itself on first launch.
- Anything else: download the AppImage from the release and run it.

## Updater

The in-app "Check for Updates" is still a no-op on Linux: the Tauri updater
needs a signing key and a `latest.json` next to the release assets. With the
repo public that is now possible; it is a separate piece of work (Windows'
`RELEASING.md` has the key procedure). The private signing key must never be
committed here.
