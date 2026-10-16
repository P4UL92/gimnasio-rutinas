#!/usr/bin/env bash
set -euo pipefail
node "$(dirname "$0")/build_web_dist.cjs"
