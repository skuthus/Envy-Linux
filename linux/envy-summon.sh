#!/usr/bin/env bash
# Summon Envy under Hyprland: toggle its scratchpad (special workspace) if it's
# running, launch it otherwise. Bound to Ctrl+Alt+Return by hyprland-envy.lua.
# Global hotkeys inside the app don't work on Wayland; this is the summon.
set -euo pipefail
bin="${ENVY_BIN:-$(cd "$(dirname "$0")/.." && pwd)/target/release/envy-linux}"
if pgrep -x envy-linux >/dev/null; then
  hyprctl dispatch "hl.dsp.workspace.toggle_special('envy')" >/dev/null
else
  if command -v uwsm-app >/dev/null 2>&1; then
    uwsm-app -- "$bin" >/dev/null 2>&1 &
  else
    setsid "$bin" >/dev/null 2>&1 &
  fi
fi
