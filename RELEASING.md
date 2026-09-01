# Releasing Envy for Linux

There is no release channel yet. This repository is private, and a private
GitHub repo cannot serve `releases/latest/download/latest.json` to an
unauthenticated Tauri updater, so the updater plugin is deliberately left
unconfigured in `src-tauri/tauri.conf.json` (see PLAN.md, Phase 6).

To get a new build on this machine:

```bash
./build.sh
```

That produces a standalone binary at `target/release/envy-linux`, plus an
AppImage and a `.deb` under `target/release/bundle/`. The `.desktop` file in
`linux/` points at the release binary; re-running `build.sh` is the update.

When a public Linux channel is wanted, revisit the Windows repo's
`RELEASING.md` for the updater-key procedure. The private signing key must
never be committed here.
