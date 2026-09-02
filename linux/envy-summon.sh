#!/usr/bin/env bash
# Summon Envy: show it if hidden, hide it if showing — the bar icon's click,
# on a key. `envy-linux --toggle` talks to the running instance over its
# control socket; with none running it simply launches, and the window
# appears. Point ENVY_BIN somewhere else to summon a different build.
#
# Backgrounded and detached: when nothing is running the binary *becomes*
# the app, and a keybind (or a shell) must not sit waiting on it.
set -euo pipefail
bin="${ENVY_BIN:-$(cd "$(dirname "$0")/.." && pwd)/target/release/envy-linux}"
if command -v uwsm-app >/dev/null 2>&1; then
  uwsm-app -- "$bin" --toggle >/dev/null 2>&1 &
else
  setsid "$bin" --toggle >/dev/null 2>&1 &
fi
