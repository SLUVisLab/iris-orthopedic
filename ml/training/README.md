# Training & evaluation

Model training and evaluation live in **[SLUVisLab/ortho_screw_dinov2](https://github.com/SLUVisLab/ortho_screw_dinov2)**, the canonical repository for the deployed dual-view DINOv2 classifier. It contains the training script, the evaluation protocol and reports (per-class accuracy, precision, F1, confusion matrix), the released weights, and an archived copy of the previous ResNet18 model under `legacy/resnet18/`.

The earlier multi-model benchmark (ResNet18, Mask R-CNN, DINOv2) that used to be copied here is in [SLUVisLab/ortho_screw_classification](https://github.com/SLUVisLab/ortho_screw_classification) and in this repository's Git history.

## After training a new checkpoint

1. Evaluate it in ortho_screw_dinov2 (`evaluate.py`, `plot_evaluation.py`).
2. Rebuild the similarity index with it: `bash ml/scripts/rebuild-index.sh <data_dir> <checkpoint.pth>`.
3. Upload the checkpoint and index: `bash ml/scripts/deploy-model.sh <checkpoint.pth> <index.pkl>`.
4. If `model.py` or the vendored DINOv2 code changed, copy them into `ml/model/` and redeploy the Space: `bash ml/scripts/deploy-space.sh`.
