#!/usr/bin/env bash
# Rebuild the embedding index from the dataset and model weights.
#
# Usage:
#   bash ml/scripts/rebuild-index.sh /path/to/dataset /path/to/weights.pth [output.pkl]
#
# Example:
#   bash ml/scripts/rebuild-index.sh ./data ./original_classifier_best.pth embeddings.pkl

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INDEXER_DIR="$(dirname "$SCRIPT_DIR")/indexer"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <data_dir> <model_path> [output_path]"
    echo "Example: $0 ./data ./original_classifier_best.pth embeddings.pkl"
    exit 1
fi

DATA_DIR="$1"
MODEL_PATH="$2"
OUTPUT_PATH="${3:-embeddings.pkl}"

echo "Rebuilding embedding index..."
echo "  Dataset:  $DATA_DIR"
echo "  Weights:  $MODEL_PATH"
echo "  Output:   $OUTPUT_PATH"

python "$INDEXER_DIR/indexer.py" \
    --data_dir "$DATA_DIR" \
    --model_path "$MODEL_PATH" \
    --output_path "$OUTPUT_PATH"

echo "Done! Index saved to: $OUTPUT_PATH"
