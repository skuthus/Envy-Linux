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
npm run tauri build -- "$@"
echo
echo "Done. Standalone app: $(pwd)/target/release/envy-linux"
