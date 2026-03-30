# Machine Learning Pipeline

This directory contains all machine learning code for OrthoScrew ID: model definitions, training scripts, the embedding indexer, the Hugging Face Space, and deployment scripts.

## Directory Layout

```
ml/
├── model/          Shared model code (single source of truth)
├── space/          Hugging Face Space (Gradio inference API)
├── training/       Training & benchmarking scripts
├── indexer/        Embedding index builder
└── scripts/        Deploy & utility scripts
```

## Architecture

The deployed model is a **Dual-View ResNet18** classifier:

- Two ResNet18 backbones (one for AP view, one for Lateral view)
- Each produces a 512-dim feature vector
- Concatenated into a 1024-dim embedding
- Fusion classifier head: `Linear(1024,512) → ReLU → Dropout → Linear(512,4)`
- 4 manufacturer classes: Depuy Expedium (Synthes), Medtronic Solera, Nuvasive Reline, Seaspine Mariner

## Hugging Face Resources

| Resource | URL |
|---|---|
| **Inference Space** | [austin-carnahan/orthopedic-screw-identification](https://huggingface.co/spaces/austin-carnahan/orthopedic-screw-identification) |
| **Model Repo** | [austin-carnahan/orthopedic-screws-model](https://huggingface.co/austin-carnahan/orthopedic-screws-model) |
| **Dataset** | [austin-carnahan/orthopedic-screw-images](https://huggingface.co/datasets/austin-carnahan/orthopedic-screw-images) |

The model weights (`.pth`) and embedding index (`embeddings.pkl`) are stored in the HF Model repo—not in this git repository.

## Prerequisites

The deploy scripts use `huggingface-cli` which must be installed and authenticated:

```bash
pip install huggingface_hub
huggingface-cli login
```

You'll be prompted for a [User Access Token](https://huggingface.co/settings/tokens) with `write` scope.
The token is cached at `~/.cache/huggingface/token` and reused for all subsequent uploads.

## End-to-End Pipeline

All training and indexing scripts write output files to the **current working directory**.
These artifacts (`.pth`, `.pkl`) are gitignored and should never be committed — they
are uploaded to Hugging Face via the deploy scripts.

```bash
# 1. Train — outputs original_classifier_best.pth to CWD
python ml/training/original_classifier/train.py --data_dir /path/to/data
# → ./original_classifier_best.pth  (best checkpoint)
# → ./original_classifier.pth       (final epoch)

# 2. Index — outputs embeddings.pkl to CWD
bash ml/scripts/rebuild-index.sh /path/to/data ./original_classifier_best.pth
# → ./embeddings.pkl

# 3. Deploy model artifacts to HF (pass the paths from steps 1 & 2)
bash ml/scripts/deploy-model.sh ./original_classifier_best.pth ./embeddings.pkl

# 4. Deploy the Gradio Space (assembles space/ + model/ into a flat bundle)
bash ml/scripts/deploy-space.sh
```

> **Note:** The deploy scripts accept arbitrary file paths — run them from wherever
> your `.pth` and `.pkl` files are, or pass absolute paths.

## Switching Models

To swap in a different model (e.g., DINOv2):

1. Train the new model and save weights
2. Update `model/original_model.py` if the architecture changed
3. Update `model/model_wrapper.py` if preprocessing changed
4. Rebuild the embedding index with the new weights
5. Deploy both the model artifacts and the space

## Subdirectory READMEs

- [model/](model/) — Model architecture and inference wrapper
- [space/](space/) — HF Space: running locally, deploying, configuration
- [training/](training/) — Training scripts, benchmarking, hyperparameter optimization
- [indexer/](indexer/) — Building the embedding similarity index
