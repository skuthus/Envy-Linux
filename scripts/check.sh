#!/usr/bin/env bash
# Pre-commit gate: everything that can be verified without a display.
# Run from anywhere; exits non-zero on the first failure.
#   ./scripts/check.sh          # tests, type-check, frontend build, audits
#   ./scripts/check.sh --quick  # skip the audits (they need the network)
set -euo pipefail
cd "$(dirname "$0")/.."

quick=0
[[ "${1:-}" == "--quick" ]] && quick=1

step() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

step "cargo test (envy-core + shell)"
cargo test --quiet 2>&1 | grep -E 'test result|error\[|panicked' || true
cargo test --quiet >/dev/null

step "TypeScript type-check"
npx tsc --noEmit

step "Frontend build"
npm run build --silent

step "Rust build (shell)"
cargo build --quiet

if (( ! quick )); then
  step "cargo audit (vulnerabilities fail; unmaintained/unsound only warn)"
  if command -v cargo-audit >/dev/null; then
    # Tauri pins the GTK3 bindings, so their "unmaintained" advisories are
    # expected noise; only a real vulnerability should block.
    cargo audit --deny warnings --ignore RUSTSEC-2024-0411 --ignore RUSTSEC-2024-0412 \
      --ignore RUSTSEC-2024-0413 --ignore RUSTSEC-2024-0414 --ignore RUSTSEC-2024-0415 \
      --ignore RUSTSEC-2024-0416 --ignore RUSTSEC-2024-0417 --ignore RUSTSEC-2024-0418 \
      --ignore RUSTSEC-2024-0419 --ignore RUSTSEC-2024-0420 --ignore RUSTSEC-2024-0429 \
      --ignore RUSTSEC-2024-0370 --ignore RUSTSEC-2024-0384 --ignore RUSTSEC-2025-0075 \
      --ignore RUSTSEC-2025-0080 --ignore RUSTSEC-2025-0081 --ignore RUSTSEC-2025-0098 \
      --ignore RUSTSEC-2025-0100 --ignore RUSTSEC-2026-0221 \
      || { echo "cargo audit found something new — read the output above"; exit 1; }
  else
    echo "cargo-audit not installed (cargo install cargo-audit --locked); skipping"
  fi

  step "npm audit (production deps only; dev-only advisories just warn)"
  npm audit --omit=dev --audit-level=high || exit 1
  npm audit --audit-level=high || echo "(dev-only advisory above — fix with npm audit fix when convenient)"
fi

step "Security invariants that a refactor could quietly undo"
grep -q '"withGlobalTauri": false' src-tauri/tauri.conf.json || { echo "withGlobalTauri must stay false"; exit 1; }
grep -q '"csp": "default-src' src-tauri/tauri.conf.json || { echo "CSP is missing from tauri.conf.json"; exit 1; }
! grep -Eq '^\s*"opener:default"' src-tauri/capabilities/*.json || { echo "capabilities should name opener permissions, not opener:default"; exit 1; }
grep -q 'navigation_guard' src-tauri/src/lib.rs || { echo "navigation guard plugin is gone"; exit 1; }
grep -q 'https?:\\/\\/\[^)\\s\]+' src/styler.ts || { echo "table link regex no longer requires //"; exit 1; }
! grep -rn '__TAURI__\|innerHTML\s*=' src/ --include=*.ts | grep -v 'styler.ts' || { echo "new innerHTML/__TAURI__ use in src/ — review it"; exit 1; }

printf '\n\033[1;32mAll checks passed.\033[0m\n'
