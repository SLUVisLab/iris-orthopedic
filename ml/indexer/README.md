# Embedding Indexer

Builds a precomputed embedding index (`embeddings.pkl`) from the training dataset. This index is used at inference time by the HF Space to find similar reference cases via cosine similarity.

## What It Does

1. Loads the trained model weights (`.pth`)
2. Iterates over all AP/Lateral image pairs in the dataset
3. For each pair, generates:
   - 1 canonical embedding (no augmentation)
   - 10 augmented embeddings (random rotation, flip, jitter) to cover visual variation
4. Saves all embeddings + metadata to `embeddings.pkl`

## Usage

```bash
cd ml/indexer

python indexer.py \
  --data_dir /path/to/dataset \
  --model_path /path/to/original_classifier_best.pth \
  --output_path embeddings.pkl
```

Or use the convenience script:

```bash
bash ml/scripts/rebuild-index.sh /path/to/dataset /path/to/weights.pth
```

### Output Location

The `embeddings.pkl` file is written to the **current working directory** (or the
path specified via `--output_path`). It is gitignored and should not be committed —
upload it to the HF Model repo using `ml/scripts/deploy-model.sh`.

## Output Format

The output `embeddings.pkl` is a pickled dictionary:

```python
{
    "embeddings": np.ndarray,  # shape (N, 1024) — feature vectors
    "metadata": [              # list of N dicts
        {
            "patient_number": int,
            "manufacturer": str,
            "ap_path": str,        # relative path in dataset
            "lat_path": str,       # relative path in dataset
            "augmented": bool      # True if this is an augmented variant
        },
        ...
    ]
}
```

## After Indexing

Upload the new `embeddings.pkl` to the HF Model repo:

```bash
bash ml/scripts/deploy-model.sh
```
