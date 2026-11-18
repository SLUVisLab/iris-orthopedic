#!/usr/bin/env bash
# Rebuild the embedding index from the dataset and model weights.
#
# Usage:
#   bash ml/scripts/rebuild-index.sh /path/to/dataset /path/to/dinov2_dual_view.pth [output.pkl]
#
# Example:
#   bash ml/scripts/rebuild-index.sh ./data/hf/data ./dinov2_dual_view.pth dinov2_embeddings.pkl
#
# /path/to/dataset is the folder containing metadata_summary.csv (for the HF dataset, its data/ folder).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INDEXER_DIR="$(dirname "$SCRIPT_DIR")/indexer"

if [ $# -lt 2 ]; then
    echo "Usage: $0 <data_dir> <model_path> [output_path]"
    echo "Example: $0 ./data/hf/data ./dinov2_dual_view.pth dinov2_embeddings.pkl"
    exit 1
fi

DATA_DIR="$1"
MODEL_PATH="$2"
OUTPUT_PATH="${3:-dinov2_embeddings.pkl}"

echo "Rebuilding embedding index..."
echo "  Dataset:  $DATA_DIR"
echo "  Weights:  $MODEL_PATH"
echo "  Output:   $OUTPUT_PATH"

python "$INDEXER_DIR/indexer.py" \
    --data_dir "$DATA_DIR" \
    --model_path "$MODEL_PATH" \
    --output_path "$OUTPUT_PATH"

echo "Done! Index saved to: $OUTPUT_PATH"
