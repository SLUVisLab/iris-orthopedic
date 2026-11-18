#!/usr/bin/env bash
# Upload the DINOv2 model artifacts and model card to the HF Model repo (one commit).
#
# Usage:
#   bash ml/scripts/deploy-model.sh <dinov2_dual_view.pth> <dinov2_embeddings.pkl> [dinov2_vits14_pretrain.pth]
#
# The checkpoint comes from SLUVisLab/ortho_screw_dinov2 (weights/ or a new training run);
# the index from ml/scripts/rebuild-index.sh. The optional pretrained backbone is published
# so a new training run can start from the HF repo alone.
#
# Prerequisites:
#   - huggingface_hub installed (provides the `hf` CLI) and `hf auth login` with write access

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ML_DIR="$(dirname "$SCRIPT_DIR")"
MODEL_REPO="austin-carnahan/orthopedic-screws-model"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <dinov2_dual_view.pth> <dinov2_embeddings.pkl> [dinov2_vits14_pretrain.pth]"
    exit 1
fi

for f in "$@"; do
    if [ ! -f "$f" ]; then
        echo "Error: file not found: $f"
        exit 1
    fi
done

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

cp "$ML_DIR/model/MODEL_CARD.md" "$TMP_DIR/README.md"
cp "$1" "$TMP_DIR/dinov2_dual_view.pth"
cp "$2" "$TMP_DIR/dinov2_embeddings.pkl"
if [ $# -ge 3 ]; then
    cp "$3" "$TMP_DIR/dinov2_vits14_pretrain.pth"
fi

echo "Uploading to HF model repo: $MODEL_REPO"
ls -la "$TMP_DIR"
hf upload "$MODEL_REPO" "$TMP_DIR" . --commit-message "Upload dual-view DINOv2 model, index, and model card"

echo "Done! Model artifacts uploaded to: https://huggingface.co/$MODEL_REPO"
