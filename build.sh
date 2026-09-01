#!/usr/bin/env bash
# Build a real, standalone Envy you can run without a terminal or a dev
# server. A release compile takes several minutes the first time.
#
# Produces:
#   target/release/envy-linux                         <- run this directly
#   target/release/bundle/appimage/*.AppImage         <- portable bundle
#   target/release/bundle/deb/*.deb                   <- Debian package
set -euo pipefail
cd "$(dirname "$0")"
echo "Building Envy (release). This takes a few minutes the first time."
# linuxdeploy (the AppImage tool Tauri downloads) ships a 2018-era `strip` that
# chokes on the `.relr.dyn` sections modern Arch libraries carry
# ("unknown type [0x13] section") and aborts the whole bundle. NO_STRIP skips
# that step; the AppImage is a little larger and otherwise identical.
export NO_STRIP="${NO_STRIP:-true}"
npm run tauri build -- "$@"
echo
echo "Done. Standalone app: $(pwd)/target/release/envy-linux"
