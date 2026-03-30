#!/usr/bin/env bash
# Upload model weights and embedding index to the HF Model repo.
#
# Usage:
#   bash ml/scripts/deploy-model.sh /path/to/original_classifier_best.pth /path/to/embeddings.pkl
#
# Prerequisites:
#   - huggingface-cli installed and logged in (pip install huggingface_hub)
#   - Write access to the HF Model repo

set -euo pipefail

MODEL_REPO="austin-carnahan/orthopedic-screws-model"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <weights.pth> <embeddings.pkl>"
    echo "Example: $0 original_classifier_best.pth embeddings.pkl"
    exit 1
fi

WEIGHTS_PATH="$1"
EMBEDDINGS_PATH="$2"

if [ ! -f "$WEIGHTS_PATH" ]; then
    echo "Error: Weights file not found: $WEIGHTS_PATH"
    exit 1
fi

if [ ! -f "$EMBEDDINGS_PATH" ]; then
    echo "Error: Embeddings file not found: $EMBEDDINGS_PATH"
    exit 1
fi

echo "Uploading weights: $WEIGHTS_PATH"
huggingface-cli upload "$MODEL_REPO" "$WEIGHTS_PATH" "original_classifier_best.pth"

echo "Uploading embeddings: $EMBEDDINGS_PATH"
huggingface-cli upload "$MODEL_REPO" "$EMBEDDINGS_PATH" "embeddings.pkl"

echo "Done! Model artifacts uploaded to: https://huggingface.co/$MODEL_REPO"
