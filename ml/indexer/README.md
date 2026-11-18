# Embedding Indexer

Builds the similar-case index (`dinov2_embeddings.pkl`) that the HF Space searches with cosine similarity to show reference cases for each predicted manufacturer.

## What It Does

1. Loads the dual-view DINOv2 checkpoint through `ml/model/model_wrapper.py`.
2. Keeps patients of the model's four classes that have at least one usable AP and one usable lateral image (an image plus a mask with a screw contour).
3. For every AP × lateral image combination of a patient, samples `--samples_per_pair` (default 10) screw-crop pairs from the masks, **the same crops the model was trained and evaluated on**: one random screw per view, a square crop twice the screw's largest side, ±5 px jitter.
4. Stores the 768-dim embedding (concatenated AP and lateral DINOv2 [CLS] features) of each pair, plus metadata pointing at the full images for display.

Sampling is seeded (`--seed`, default 0), so rebuilding with the same data and checkpoint gives the same index. On the November 2026 dataset it produces 1,650 embeddings from 111 patients (about 5 MB) in about a minute on a laptop; no GPU is needed.

## Usage

```bash
python ml/indexer/indexer.py \
  --data_dir /path/to/data \
  --model_path /path/to/dinov2_dual_view.pth \
  --output_path dinov2_embeddings.pkl
```

`--data_dir` is the folder containing `metadata_summary.csv` (for the Hugging Face dataset, its `data/` folder). Or use the convenience script:

```bash
bash ml/scripts/rebuild-index.sh /path/to/data /path/to/dinov2_dual_view.pth
```

Requires `torch`, `torchvision`, `opencv-python`, `pandas`, `pillow`, and `tqdm`. The output is written to `--output_path`; `.pkl` files are gitignored and are uploaded to the HF model repo with `ml/scripts/deploy-model.sh`.

## Output Format

```python
{
    "embeddings": np.ndarray,  # shape (N, 768), float32
    "metadata": [              # list of N dicts
        {
            "patient_number": int,
            "manufacturer": str,
            "ap_path": str,        # full AP image, relative to the dataset's data/ folder
            "lat_path": str,       # full lateral image
            "augmented": bool,     # sample > 0 (kept for compatibility with the old format)
            "sample": int,         # which sampled crop pair (0..samples_per_pair-1)
        },
        ...
    ],
    "info": {                  # provenance: model, embedding_dim, checkpoint_sha256, seed, ...
        ...
    }
}
```

The index includes every labeled patient of the four classes, including the model's evaluation-split patients; it is a reference library, not an evaluation set.
