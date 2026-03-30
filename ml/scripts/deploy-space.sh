#!/usr/bin/env bash
# Deploy the HF Space by assembling space code + shared model files and pushing.
#
# Usage:
#   bash ml/scripts/deploy-space.sh
#
# Prerequisites:
#   - huggingface-cli installed and logged in (pip install huggingface_hub)
#   - Write access to the HF Space repo

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ML_DIR="$(dirname "$SCRIPT_DIR")"

SPACE_REPO="austin-carnahan/orthopedic-screw-identification"

# Create a temporary directory for the assembled bundle
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Assembling Space bundle..."

# Copy space files
cp "$ML_DIR/space/app.py" "$TMP_DIR/"
cp "$ML_DIR/space/README.md" "$TMP_DIR/"
cp "$ML_DIR/space/requirements.txt" "$TMP_DIR/"

# Copy shared model code (HF Spaces need a flat directory)
cp "$ML_DIR/model/original_model.py" "$TMP_DIR/"
cp "$ML_DIR/model/model_wrapper.py" "$TMP_DIR/"

echo "Uploading to HF Space: $SPACE_REPO"
huggingface-cli upload "$SPACE_REPO" "$TMP_DIR" . --repo-type space

echo "Done! Space deployed to: https://huggingface.co/spaces/$SPACE_REPO"
