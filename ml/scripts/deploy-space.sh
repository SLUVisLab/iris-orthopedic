#!/usr/bin/env bash
# Update the existing HF Space in place: assemble space code + shared model files and push
# them as one commit.
#
# Usage:
#   bash ml/scripts/deploy-space.sh
#   SPACE_REVISION=some-branch bash ml/scripts/deploy-space.sh   # push to a side branch (no rebuild)
#
# Upload the model artifacts first (deploy-model.sh): the Space downloads
# dinov2_dual_view.pth and dinov2_embeddings.pkl from the model repo at startup.
#
# Prerequisites:
#   - Python with huggingface_hub installed (set PYTHON to choose the interpreter)
#   - `hf auth login` with write access to the Space
#
# Why not `hf upload`: it first asks the Hub to create the repo ("exist_ok"), and the Hub
# now refuses that request for Gradio Spaces on free cpu-basic hardware (HTTP 402, PRO
# required), even when the Space already exists. Committing directly to the existing
# Space with HfApi.upload_folder avoids that request; the Space keeps its hardware.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ML_DIR="$(dirname "$SCRIPT_DIR")"
SPACE_REPO="austin-carnahan/orthopedic-screw-identification"
SPACE_REVISION="${SPACE_REVISION:-main}"
PYTHON="${PYTHON:-python3}"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Assembling Space bundle..."
cp "$ML_DIR/space/app.py" "$ML_DIR/space/README.md" "$ML_DIR/space/requirements.txt" "$TMP_DIR/"
# Shared model code + vendored DINOv2 source (HF Spaces need it next to app.py)
cp "$ML_DIR/model/model.py" "$ML_DIR/model/model_wrapper.py" "$TMP_DIR/"
cp -R "$ML_DIR/model/vendor" "$TMP_DIR/vendor"
find "$TMP_DIR" -name __pycache__ -prune -exec rm -rf {} +

echo "Uploading to HF Space: $SPACE_REPO (revision: $SPACE_REVISION)"
# delete_patterns removes stale Python files from earlier deployments (e.g. the old ResNet
# model); files uploaded in this commit are kept.
"$PYTHON" - "$SPACE_REPO" "$TMP_DIR" "$SPACE_REVISION" <<'EOF'
import sys
from huggingface_hub import HfApi

repo_id, folder, revision = sys.argv[1:4]
api = HfApi()
api.repo_info(repo_id, repo_type="space")  # fail early if the Space doesn't exist / no access
if revision != "main":
    api.create_branch(repo_id, repo_type="space", branch=revision, exist_ok=True)
commit = api.upload_folder(
    repo_id=repo_id,
    repo_type="space",
    folder_path=folder,
    path_in_repo=".",
    revision=revision,
    delete_patterns=["*.py", "vendor/**"],
    commit_message="Deploy dual-view DINOv2 model",
)
print("Commit:", commit.commit_url)
EOF

echo "Done! Space updated: https://huggingface.co/spaces/$SPACE_REPO"
