#!/usr/bin/env bash
# Drive the real app under Hyprland and check what lands on disk.
#
# Launches the dev build, then — through the window, as a user would — creates
# a note, edits it, opens and edits a template, and deletes the note. Each
# step is verified by what appears in the vault, not by what the script typed,
# so it exercises save, the template read/save path, the file watcher, the
# table/link/image renderer (see the screenshots) and delete-to-trash.
#
#   ./scripts/gui-smoke.sh [output-dir]      # screenshots + dev.log go there
#
# Needs: hyprctl, grim, wtype, jq. It writes into the Index, so it refuses to
# run unless the Index path contains "Test Vault" or ENVY_SMOKE_ALLOW=1.
# Not covered (no Wayland click tool): the pinned-note and pop-out windows —
# check those by hand: right-click a note → Pop Out; Ctrl+Alt+T pins to tray.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="${1:-${XDG_RUNTIME_DIR:-/tmp}/envy-smoke}"
mkdir -p "$OUT"
for t in hyprctl grim wtype jq; do
  command -v "$t" >/dev/null || { echo "need $t"; exit 2; }
done

VAULT="$(cat ~/.config/app.envynote.linux/index-path 2>/dev/null || true)"
[[ -d "$VAULT" ]] || { echo "no Index configured (~/.config/app.envynote.linux/index-path)"; exit 2; }
if [[ "$VAULT" != *"Test Vault"* && "${ENVY_SMOKE_ALLOW:-}" != 1 ]]; then
  echo "Index is '$VAULT', not a test vault. Point Envy at one (scripts/gen-test-vault.mjs)"
  echo "or set ENVY_SMOKE_ALLOW=1 to run against it anyway."
  exit 2
fi

TITLE="Smoke Test Note"
NOTE="$VAULT/$TITLE.md"
TEMPLATE="$(ls "$VAULT"/Templates/*.md 2>/dev/null | head -1 || true)"
IMAGE=""; for f in "$VAULT"/Attachments/*.png; do [[ -e "$f" ]] && IMAGE="$(basename "$f")" && break; done
MARK="smoke-$(date +%s)"
fails=0
pass() { echo "  ok   $*"; }
fail() { echo "  FAIL $*"; fails=$((fails+1)); }

DEVPID=""
cleanup() {
  # The dev server is started in its own session, so its process group holds
  # npm, the tauri CLI, vite, cargo and the app — one signal takes them all.
  [[ -n "$DEVPID" ]] && kill -TERM -- "-$DEVPID" 2>/dev/null || true
  pkill -x envy-linux 2>/dev/null || true
  [[ -n "$TEMPLATE" && -f "$OUT/template.bak" ]] && cp "$OUT/template.bak" "$TEMPLATE"
  rm -f "$NOTE" "$VAULT/.trash/$TITLE.md"
}
trap cleanup EXIT

pgrep -x envy-linux >/dev/null && { echo "Envy is already running; close it first"; exit 2; }
if ss -ltn | grep -q ':1420 '; then
  echo "port 1420 is busy — a stale vite from an earlier run? try: pkill -f node_modules/.bin/vite"; exit 2
fi
rm -f "$NOTE" "$VAULT/.trash/$TITLE.md"

echo "== launching dev build (log: $OUT/dev.log)"
setsid npm run tauri dev >"$OUT/dev.log" 2>&1 &
DEVPID=$!
for _ in $(seq 1 90); do
  hyprctl clients -j | jq -e '.[] | select(.class=="envy-linux")' >/dev/null 2>&1 && break
  grep -q 'terminated with a non-zero status\|error\[E' "$OUT/dev.log" 2>/dev/null && break
  sleep 2
done
GEO="$(hyprctl clients -j | jq -r '.[] | select(.class=="envy-linux") | "\(.at[0]),\(.at[1]) \(.size[0])x\(.size[1])"' | head -1)"
[[ -n "$GEO" ]] || { echo "window never appeared — see $OUT/dev.log"; exit 1; }
pass "window up at $GEO"

# Omarchy's Hyprland takes Lua dispatches and reports failure by message, not
# exit code, so focus is confirmed by asking which window is active.
focus() {
  for _ in 1 2 3 4 5; do
    hyprctl dispatch 'hl.dsp.focus({window="class:envy-linux"})' >/dev/null 2>&1 || true
    sleep 0.3
    [[ "$(hyprctl activewindow -j | jq -r .class)" == envy-linux ]] && return 0
    sleep 0.5
  done
  echo "could not focus the Envy window"; return 1
}
shot()  { grim -g "$GEO" "$OUT/$1.png"; }
search() { wtype -M ctrl l -m ctrl; sleep 0.2; wtype -M alt -k BackSpace -m alt; sleep 0.2; wtype "$1"; sleep 0.8; wtype -k Return; sleep 1.2; }
append_line() { wtype -M ctrl -k End -m ctrl; wtype -k Return; wtype "$1"; sleep 3; }

focus; shot 1-launch

echo "== note written on disk is picked up by the watcher and renders"
{
  printf '# %s\n\n| Link | Kind |\n| --- | --- |\n' "$TITLE"
  printf '| [good](https://example.com) | must be a live link |\n'
  printf '| [bad](https:evil.com) | must stay plain text |\n'
  printf '| **bold** and `code` | formatting |\n\nProse link: https://envynote.app\n'
  [[ -n "$IMAGE" ]] && printf '\n![[%s]]\n' "$IMAGE"
} >"$NOTE"
sleep 3; focus; search "$TITLE"; shot 2-table-and-image
pass "note opened — rendering is checked by eye in 2-table-and-image.png"

echo "== typing in the editor saves to disk"
append_line "$MARK-note"
grep -q "$MARK-note" "$NOTE" && pass "edit saved" || fail "edit did not reach $NOTE"

if [[ -n "$TEMPLATE" ]]; then
  echo "== template opens and saves through the validated template path"
  cp "$TEMPLATE" "$OUT/template.bak"
  tname="$(basename "$TEMPLATE" .md)"
  focus; search "template:$tname"; append_line "$MARK-template"; shot 3-template
  grep -q "$MARK-template" "$TEMPLATE" && pass "template saved" || fail "template edit did not reach $TEMPLATE"
  cp "$OUT/template.bak" "$TEMPLATE"
else
  echo "  skip no templates in $VAULT/Templates"
fi

echo "== delete moves the note into the vault's .trash"
focus; search "$TITLE"; wtype -M ctrl -k BackSpace -m ctrl; sleep 2.5; shot 4-after-delete
[[ ! -e "$NOTE" && -e "$VAULT/.trash/$TITLE.md" ]] && pass "moved to .trash" || fail "note not in .trash"

echo "== dev log"
if grep -iE 'panic|Refused to|Content Security Policy|error' "$OUT/dev.log" | grep -v appindicator | grep -q .; then
  fail "log has errors:"; grep -iE 'panic|Refused|Content Security|error' "$OUT/dev.log" | grep -v appindicator | head -5
else
  pass "no errors"
fi

echo
if (( fails == 0 )); then
  echo "PASS — look at $OUT/2-table-and-image.png: 'good' underlined, 'bad' plain, image visible."
else
  echo "FAIL ($fails) — screenshots and dev.log in $OUT"; exit 1
fi
