#!/usr/bin/env bash
# コマンドを実行し、失敗した場合は出力の末尾を GitHub Actions のエラー注記として残す。
# 注記は GitHub API（check-runs annotations）からも読めるため、ログを開けない環境でも原因を確認できる。
#
# 使い方: .github/scripts/run-step.sh "<ステップ名>" <コマンド...>
set -uo pipefail

title="$1"
shift

log="$(mktemp)"
"$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  # 注記は1件にまとめる（改行は %0A でエンコード）
  msg="$(tail -n 40 "$log" | sed -e 's/%/%25/g' -e 's/\r//g' | awk 'BEGIN{ORS="%0A"} {print}')"
  echo "::error title=${title} failed (exit ${status})::${msg}"
fi

rm -f "$log"
exit "$status"
