#!/bin/sh
# Tell the agent how to install the dbg CLI the skill drives, when it is missing. Silent otherwise.
command -v dbg >/dev/null 2>&1 && exit 0
echo "debug-that plugin: the dbg CLI is not installed. Install it with: bun install --global debug-that"
exit 0
