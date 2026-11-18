# Shared model code

The model used by the Hugging Face Space and the embedding indexer: the **dual-view DINOv2** manufacturer classifier from [SLUVisLab/ortho_screw_dinov2](https://github.com/SLUVisLab/ortho_screw_dinov2), which is the canonical repository for training and evaluating it.

| File | Purpose |
|---|---|
| `model.py` | Model definition and strict checkpoint loader. Byte-identical copy of `model.py` from ortho_screw_dinov2. |
| `vendor/dinov2/` | Meta's DINOv2 architecture source (Apache-2.0, see `vendor/dinov2/LICENSE`), copied unchanged from ortho_screw_dinov2 so no code or weights are fetched from Torch Hub at runtime. |
| `model_wrapper.py` | Inference wrapper (preprocessing, probabilities, 768-dim embedding) used by `ml/space/app.py` and `ml/indexer/indexer.py`. |

Copied from ortho_screw_dinov2 commit `38d0b2a10f209d760d28947ca8d64b6b607eb032`. If the model code there changes, copy `model.py` and `vendor/` again and rebuild the index.

## Architecture

- One **shared, frozen DINOv2 ViT-S/14** backbone runs on each view and returns its 384-dim [CLS] feature.
- The AP and lateral features are concatenated into a **768-dim embedding**, which is also what the similarity index stores.
- Fusion head: `Linear(768,512) → ReLU → Dropout(0.5) → Linear(512,4)`.
- Classes (index order): `Depuy expedium (Synthes)`, `medtronic solera`, `nuvasive reline`, `seaspine mariner`.

## Preprocessing

`model_wrapper.INFERENCE_TRANSFORM` is the model's evaluation transform: resize to 224×224, grayscale to 3 channels, ImageNet normalization. The model was trained and evaluated on **screw-centered context crops about twice the screw's largest dimension**, so the closer a user's crop is to that, the better.

## Weights

The trained checkpoint (`dinov2_dual_view.pth`) is not in Git. It is published in the Hugging Face model repo [`austin-carnahan/orthopedic-screws-model`](https://huggingface.co/austin-carnahan/orthopedic-screws-model), which the Space downloads at startup. Checksums are in ortho_screw_dinov2's `weights_manifest.json`.
