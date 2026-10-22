#!/bin/bash
# クラウドセッションの開始時に Node 24 と依存関係を用意する（手元の PC では何もしない）
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Node 22 付属の npm 10 では依存解決が失敗するので、nvm で Node 24 を使う
export NVM_DIR="${NVM_DIR:-/opt/nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  set +u
  . "$NVM_DIR/nvm.sh"
  nvm install 24 >/dev/null
  nvm use 24 >/dev/null
  set -u
  # 以降のコマンドでも Node 24 を使う
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export PATH=\"$(dirname "$(nvm which 24)"):\$PATH\"" >> "$CLAUDE_ENV_FILE"
  fi
fi

# package-lock.json どおりに入れる（入っていれば短時間で終わる）
npm install --no-audit --no-fund
