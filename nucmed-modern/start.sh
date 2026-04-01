#!/bin/sh
set -eu

echo "[Start] Delegating to entrypoint.sh"
exec ./entrypoint.sh
