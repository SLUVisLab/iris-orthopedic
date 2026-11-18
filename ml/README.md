# Machine Learning Pipeline

This directory contains the deployment side of OrthoScrew ID's machine learning: the shared model code, the embedding indexer, the Hugging Face Space, and deployment scripts.

**Training and evaluation live in [SLUVisLab/ortho_screw_dinov2](https://github.com/SLUVisLab/ortho_screw_dinov2)**, the canonical repository for the deployed model (training script, evaluation reports, released weights, and an archived copy of the previous ResNet18 model).

## Directory Layout

```
ml/
├── model/          Model code used by the Space and indexer (copied from ortho_screw_dinov2) + HF model card
├── space/          Hugging Face Space (Gradio inference API)
├── indexer/        Similar-case embedding index builder
├── training/       Pointer to ortho_screw_dinov2
└── scripts/        Deploy & utility scripts
```

## Architecture

The deployed model is a **dual-view DINOv2** classifier:

- One shared, frozen DINOv2 ViT-S/14 backbone encodes the AP view and the lateral view separately (384-dim [CLS] feature each)
- The two features are concatenated into a 768-dim embedding, also used for similar-case search
- Fusion classifier head: `Linear(768,512) → ReLU → Dropout → Linear(512,4)`
- 4 manufacturer classes: Depuy Expedium (Synthes), Medtronic Solera, Nuvasive Reline, Seaspine Mariner

On its 26-patient evaluation split it reaches 59.6% accuracy, 46.9% balanced accuracy, and 46.3% macro-F1; see ortho_screw_dinov2's README for per-class results and limitations. Details: [model/README.md](model/README.md).

## Hugging Face Resources

| Resource | URL |
|---|---|
| **Inference Space** | [austin-carnahan/orthopedic-screw-identification](https://huggingface.co/spaces/austin-carnahan/orthopedic-screw-identification) |
| **Model Repo** | [austin-carnahan/orthopedic-screws-model](https://huggingface.co/austin-carnahan/orthopedic-screws-model) |
| **Dataset** | [austin-carnahan/orthopedic-screw-images](https://huggingface.co/datasets/austin-carnahan/orthopedic-screw-images) |

The model weights (`dinov2_dual_view.pth`), the pretrained backbone (`dinov2_vits14_pretrain.pth`), and the embedding index (`dinov2_embeddings.pkl`) are stored in the HF Model repo, not in this git repository. The model repo's README is [model/MODEL_CARD.md](model/MODEL_CARD.md), uploaded by `deploy-model.sh`.

## Prerequisites

The deploy scripts use `huggingface_hub`: `deploy-model.sh` calls its `hf` CLI (the older `huggingface-cli` command no longer exists in current releases), and `deploy-space.sh` uses its Python API to commit to the existing Space directly, because the Hub refuses the CLI's "create repo" step for Gradio Spaces on free hardware (see the comment in that script):

```bash
pip install huggingface_hub
hf auth login
```

You'll be prompted for a [User Access Token](https://huggingface.co/settings/tokens) with `write` scope. Check it with `hf auth whoami`.

## End-to-End Pipeline

```bash
# 0. Data and weights
hf download austin-carnahan/orthopedic-screw-images --repo-type dataset --local-dir data/hf
#    Checkpoint: ortho_screw_dinov2's weights/dinov2_dual_view.pth (released) or a new
#    training run's best_dual_view.pth

# 1. Index — builds the similar-case index from the dataset with that checkpoint
bash ml/scripts/rebuild-index.sh data/hf/data /path/to/dinov2_dual_view.pth
# → ./dinov2_embeddings.pkl

# 2. Upload model artifacts + model card to the HF model repo
bash ml/scripts/deploy-model.sh /path/to/dinov2_dual_view.pth ./dinov2_embeddings.pkl \
  /path/to/dinov2_vits14_pretrain.pth

# 3. Deploy the Gradio Space (assembles space/ + model/ into a flat bundle)
bash ml/scripts/deploy-space.sh
```

Upload the model artifacts (step 2) before deploying the Space (step 3): the Space downloads them at startup. `.pth` and `.pkl` files are gitignored and should never be committed.

## Changing the Model

1. Train and evaluate the new model in ortho_screw_dinov2
2. If `model.py` or `vendor/` changed there, copy them into `ml/model/` (and update `model_wrapper.py` if preprocessing changed)
3. Rebuild the embedding index with the new weights
4. Deploy the model artifacts, then the Space

The Space's response format (`results[].manufacturer`, `confidence`, `similar[]`) is what the app reads; keep it stable so the app needs no changes.

## Subdirectory READMEs

- [model/](model/) — Model code, preprocessing, and provenance
- [space/](space/) — HF Space: running locally, deploying, API reference
- [indexer/](indexer/) — Building the similar-case index
- [training/](training/) — Where training and evaluation live
