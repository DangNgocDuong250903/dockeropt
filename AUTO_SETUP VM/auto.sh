#!/bin/bash
# Unified CLI Tool Launcher for Linux/Mac
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 "$SCRIPT_DIR/auto.py" "$@"

