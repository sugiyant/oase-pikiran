#!/bin/bash
set -a
source ~/.env
set +a
node scripts/generate-bulk.js
