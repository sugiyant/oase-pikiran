#!/bin/bash
set -a
source ~/.env
set +a
node scripts/translate-vietnamese.js > translate.log 2>&1
