import json
import pickle

import gradio as gr
import numpy as np
from huggingface_hub import hf_hub_download
from model_wrapper import ClassifierWrapper
from PIL import Image
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------------------------------------------------------
# Configuration — fill in your HF repo IDs
# ---------------------------------------------------------------------------
MODEL_REPO = "**YOUR_HF_USERNAME/iris-orthopedic**"  # HF Model repo
DATASET_REPO = "**YOUR_HF_USERNAME/iris-orthopedic-screws**"  # HF Dataset repo

MODEL_FILENAME = "original_classifier_best.pth"
INDEX_FILENAME = "embeddings.pkl"

# Base URL for serving reference images from the dataset repo
DATASET_IMAGE_BASE = (
    f"https://huggingface.co/datasets/{DATASET_REPO}/resolve/main/data"
)

# Classes — must match training order (sorted alphabetically)
CLASSES = sorted(
    [
        "Depuy expedium (Synthes)",
        "medtronic solera",
        "nuvasive reline",
        "seaspine mariner",
    ]
)

# ---------------------------------------------------------------------------
# Load model + embedding index from HF Hub (cached after first download)
# ---------------------------------------------------------------------------
print("Downloading model weights...")
model_path = hf_hub_download(repo_id=MODEL_REPO, filename=MODEL_FILENAME)

print("Downloading embedding index...")
index_path = hf_hub_download(repo_id=MODEL_REPO, filename=INDEX_FILENAME)

print("Loading model...")
wrapper = ClassifierWrapper(model_path, device="cpu")

print("Loading embedding index...")
with open(index_path, "rb") as f:
    index = pickle.load(f)

print(f"Index loaded: {len(index['embeddings'])} embeddings")


# ---------------------------------------------------------------------------
# Prediction function
# ---------------------------------------------------------------------------
def predict(ap_image: Image.Image, lat_image: Image.Image) -> dict:
    """
    Accepts AP and Lateral PIL images.
    Returns JSON with ranked predictions and similar reference cases.
    """
    if ap_image is None or lat_image is None:
        return {"error": "Please provide both AP and Lateral images."}

    # Run inference
    probs, embedding = wrapper.predict_pil(ap_image, lat_image)

    # Cosine similarity against the full index
    query_emb = embedding.reshape(1, -1)
    sims = cosine_similarity(query_emb, index["embeddings"])[0]

    results = []

    for idx, cls in enumerate(CLASSES):
        confidence = float(probs[idx])

        # Find top 3 most similar cases for this class (one per patient)
        class_similar = []
        class_indices = [
            i for i, m in enumerate(index["metadata"]) if m["manufacturer"] == cls
        ]

        if class_indices:
            class_sims = sims[class_indices]
            sorted_subset_args = class_sims.argsort()[::-1]

            seen_patients = set()
            for subset_idx in sorted_subset_args:
                if len(class_similar) >= 3:
                    break

                original_idx = class_indices[subset_idx]
                meta = index["metadata"][original_idx]
                pid = meta["patient_number"]

                if pid not in seen_patients:
                    seen_patients.add(pid)
                    class_similar.append(
                        {
                            "manufacturer": meta["manufacturer"],
                            "score": float(sims[original_idx]),
                            "ap_url": f"{DATASET_IMAGE_BASE}/{meta['ap_path']}",
                            "lat_url": f"{DATASET_IMAGE_BASE}/{meta['lat_path']}",
                        }
                    )

        results.append(
            {
                "manufacturer": cls,
                "confidence": confidence,
                "similar": class_similar,
            }
        )

    # Sort by confidence descending
    results.sort(key=lambda x: x["confidence"], reverse=True)

    return {"results": results}


# ---------------------------------------------------------------------------
# Gradio Interface
# ---------------------------------------------------------------------------
demo = gr.Interface(
    fn=predict,
    inputs=[
        gr.Image(type="pil", label="AP View"),
        gr.Image(type="pil", label="Lateral View"),
    ],
    outputs=gr.JSON(label="Predictions"),
    title="OrthoScrew ID",
    description=(
        "Upload AP and Lateral X-ray views of a pedicle screw. "
        "The model identifies the manufacturer and returns similar reference cases."
    ),
    examples=None,
)

if __name__ == "__main__":
    demo.launch()
