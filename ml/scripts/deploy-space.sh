#!/usr/bin/env bash
# Deploy the HF Space by assembling space code + shared model files and pushing (one commit).
#
# Usage:
#   bash ml/scripts/deploy-space.sh
#
# Upload the model artifacts first (deploy-model.sh): the Space downloads
# dinov2_dual_view.pth and dinov2_embeddings.pkl from the model repo at startup.
#
# Prerequisites:
#   - huggingface_hub installed (provides the `hf` CLI) and `hf auth login` with write access

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ML_DIR="$(dirname "$SCRIPT_DIR")"
SPACE_REPO="austin-carnahan/orthopedic-screw-identification"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Assembling Space bundle..."
cp "$ML_DIR/space/app.py" "$ML_DIR/space/README.md" "$ML_DIR/space/requirements.txt" "$TMP_DIR/"
# Shared model code + vendored DINOv2 source (HF Spaces need it next to app.py)
cp "$ML_DIR/model/model.py" "$ML_DIR/model/model_wrapper.py" "$TMP_DIR/"
cp -R "$ML_DIR/model/vendor" "$TMP_DIR/vendor"
find "$TMP_DIR" -name __pycache__ -prune -exec rm -rf {} +

echo "Uploading to HF Space: $SPACE_REPO"
# --delete removes stale Python files from earlier deployments (e.g. the old ResNet model);
# files uploaded in this commit are kept.
hf upload "$SPACE_REPO" "$TMP_DIR" . --repo-type space \
    --delete "*.py" "vendor/**" \
    --commit-message "Deploy dual-view DINOv2 model"

echo "Done! Space deployed to: https://huggingface.co/spaces/$SPACE_REPO"
