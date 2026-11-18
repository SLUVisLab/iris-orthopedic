---
license: mit
datasets:
- austin-carnahan/orthopedic-screw-images
language:
- en
pipeline_tag: image-classification
tags:
- medical-imaging
- orthopedic
- dinov2
- dual-view
- x-rays
---

# Orthopedic screw manufacturer classifier (dual-view DINOv2)

Identifies the manufacturer of a pedicle screw from two X-ray views of the same patient: an **AP** crop and a **lateral** crop, each centered on a screw. It powers the [OrthoScrew ID Space](https://huggingface.co/spaces/austin-carnahan/orthopedic-screw-identification) and the [OrthoScrew ID web app](https://sluvislab.github.io/iris-orthopedic/).

Training, evaluation, and the full model code live in [SLUVisLab/ortho_screw_dinov2](https://github.com/SLUVisLab/ortho_screw_dinov2) (access by request). Deployment code (this card, the Space, the similarity index) lives in [SLUVisLab/iris-orthopedic](https://github.com/SLUVisLab/iris-orthopedic) under `ml/`.

> **Assistive use only.** Predictions can be wrong. This model is not a medical device and must not replace confirmation of an implant's manufacturer by the treating team.

## Files

| File | Purpose |
|---|---|
| `dinov2_dual_view.pth` | The trained four-class dual-view model (full state dict, including the frozen backbone) |
| `dinov2_vits14_pretrain.pth` | Meta's pretrained DINOv2 ViT-S/14 backbone, used to initialize a new training run |
| `dinov2_embeddings.pkl` | Similarity index used by the Space: 768-dim embeddings of mask-based screw crops from the dataset, with patient and image metadata |

SHA256 checksums for the two `.pth` files are in `weights_manifest.json` in the ortho_screw_dinov2 repository.

## Model

- One shared, **frozen** DINOv2 ViT-S/14 backbone (Meta, Apache-2.0) encodes each view; its 384-dim [CLS] features are concatenated (768-dim).
- A trained fusion head: `Linear(768,512) → ReLU → Dropout(0.5) → Linear(512,4)`.
- Input: grayscale screw crops about twice the screw's largest dimension, resized to 224×224, replicated to 3 channels, ImageNet-normalized.
- Output classes (index order): `Depuy expedium (Synthes)`, `medtronic solera`, `nuvasive reline`, `seaspine mariner`.
- Trained with cross entropy, Adam (lr 1e-4, weight decay 1e-4), 50 epochs, batch 16, inverse-frequency patient sampling; only the head is trained.

## Evaluation

On the 26-patient evaluation split (240 sampled AP/lateral crop pairs) of [`austin-carnahan/orthopedic-screw-images`](https://huggingface.co/datasets/austin-carnahan/orthopedic-screw-images):

| Metric | Value |
|---|---|
| Accuracy | 59.6% (143/240) |
| Balanced accuracy | 46.9% |
| Macro-F1 | 46.3% |

| Manufacturer | Per-class accuracy (recall) | Precision | F1 |
|---|---:|---:|---:|
| DePuy Expedium (Synthes) | 45.0% | 31.0% | 36.7% |
| Medtronic Solera | 89.1% | 83.1% | 86.0% |
| NuVasive Reline | 36.7% | 48.9% | 41.9% |
| SeaSpine Mariner | 16.7% | 26.3% | 20.4% |

Limitations:

- The evaluation split is the checkpoint-selection split, not an independent test set, and it is small (3–11 patients per class).
- Accuracy is driven by Medtronic, the largest class; performance on DePuy, NuVasive, and especially SeaSpine is weak.
- Only these four manufacturers are recognized. Screws from any other manufacturer will still be assigned one of the four.
- The model expects tight, screw-centered crops; uncropped or loosely cropped X-rays are outside what it was trained on.

## Usage

```bash
hf download austin-carnahan/orthopedic-screws-model dinov2_dual_view.pth --local-dir weights
```

Load it with `model.load_checkpoint` from ortho_screw_dinov2 (or iris-orthopedic `ml/model/`), which includes the vendored DINOv2 architecture code.

## Previous model

Until November 2026 this repository held a dual-view ResNet18 (`original_classifier_best.pth`, `embeddings.pkl`). Those files remain available at revision [`f439fc0`](https://huggingface.co/austin-carnahan/orthopedic-screws-model/tree/f439fc0fb997b9f2792deb0f7e2c029b7f09171a); ortho_screw_dinov2's `legacy/resnet18/` documents and compares it.
