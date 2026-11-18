"""Build the similar-case embedding index used by the HF Space.

For every patient of the four model classes, every AP x lateral image combination is
embedded several times, each time with a screw crop sampled from the masks exactly the
way the model was trained and evaluated (one random screw per view, 2x context crop with
small jitter). Embeddings are the 768-dim concatenated DINOv2 [CLS] features.

Usage (from the repo root):
    python ml/indexer/indexer.py --data_dir /path/to/data --model_path dinov2_dual_view.pth \
        --output_path dinov2_embeddings.pkl
"""
import argparse
import datetime
import hashlib
import os
import pickle
import random
import sys

import cv2
import numpy as np
import pandas as pd
import torch
from PIL import Image
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "model"))
from model_wrapper import ClassifierWrapper  # noqa: E402


def mask_path_for(data_dir, rel_path):
    """'<mfr>/<patient>/images/<name>.jpg' -> '<mfr>/<patient>/masks/<name>_mask.jpg'."""
    parts = rel_path.split("/")
    if "images" not in parts:
        return None
    parts[parts.index("images")] = "masks"
    name, ext = os.path.splitext(parts[-1])
    parts[-1] = f"{name}_mask{ext}"
    return os.path.join(data_dir, *parts)


def load_image_and_screws(data_dir, rel_path):
    """Grayscale image plus its screw contours (area > 100 px), or None if unusable."""
    image = cv2.imread(os.path.join(data_dir, rel_path), cv2.IMREAD_GRAYSCALE)
    mask_path = mask_path_for(data_dir, rel_path)
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE) if mask_path else None
    if image is None or mask is None:
        return None
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = [c for c in contours if cv2.contourArea(c) > 100]
    return (image, contours) if contours else None


def screw_crop(image, contours, rng):
    """Same crop as ortho_screw_dinov2's dataset.get_screw_crop, with an explicit RNG."""
    x, y, w, h = cv2.boundingRect(rng.choice(contours))
    cx = x + w / 2 + rng.randint(-5, 5)
    cy = y + h / 2 + rng.randint(-5, 5)
    crop_size = int(max(w, h) * 2.0)
    half = crop_size // 2
    x1, y1 = int(cx - half), int(cy - half)
    x2, y2 = x1 + crop_size, y1 + crop_size
    h_img, w_img = image.shape[:2]
    pad_l, pad_t = max(0, -x1), max(0, -y1)
    pad_r, pad_b = max(0, x2 - w_img), max(0, y2 - h_img)
    if pad_l or pad_t or pad_r or pad_b:
        image = cv2.copyMakeBorder(image, pad_t, pad_b, pad_l, pad_r, cv2.BORDER_REPLICATE)
        x1, x2, y1, y2 = x1 + pad_l, x2 + pad_l, y1 + pad_t, y2 + pad_t
    return Image.fromarray(image[y1:y2, x1:x2])


def index_dataset(data_dir, model_path, output_path, samples_per_pair=10, seed=0,
                  device="cpu", batch_size=64):
    print(f"Indexing data from {data_dir}...")
    wrapper = ClassifierWrapper(model_path, device=device)
    df = pd.read_csv(os.path.join(data_dir, "metadata_summary.csv"))
    df = df[df["manufacturer"].isin(wrapper.classes)]
    rng = random.Random(seed)

    embeddings, metadata = [], []
    pending_ap, pending_lat, pending_meta = [], [], []

    def flush():
        if not pending_meta:
            return
        _, emb = wrapper.predict_tensors(torch.stack(pending_ap), torch.stack(pending_lat))
        embeddings.append(emb.astype(np.float32))
        metadata.extend(pending_meta)
        pending_ap.clear(); pending_lat.clear(); pending_meta.clear()

    skipped_patients = 0
    for pid, group in tqdm(df.groupby("patient_number"), desc="patients"):
        manufacturer = group["manufacturer"].iloc[0]
        ap_rows = group[group["view_position"] == "AP"]["relative_file_path"].tolist()
        lat_rows = group[group["view_position"] == "LATERAL"]["relative_file_path"].tolist()
        loaded = {p: load_image_and_screws(data_dir, p) for p in ap_rows + lat_rows}
        ap_rows = [p for p in ap_rows if loaded[p]]
        lat_rows = [p for p in lat_rows if loaded[p]]
        if not ap_rows or not lat_rows:
            skipped_patients += 1
            continue
        for ap_path in ap_rows:
            for lat_path in lat_rows:
                for k in range(samples_per_pair):
                    pending_ap.append(wrapper.transform(screw_crop(*loaded[ap_path], rng).convert("RGB")))
                    pending_lat.append(wrapper.transform(screw_crop(*loaded[lat_path], rng).convert("RGB")))
                    pending_meta.append({
                        "patient_number": int(pid),
                        "manufacturer": manufacturer,
                        "ap_path": ap_path,      # full image, used for display links
                        "lat_path": lat_path,
                        "augmented": k > 0,       # kept for compatibility with the old index format
                        "sample": k,
                    })
                    if len(pending_meta) >= batch_size:
                        flush()
    flush()

    with open(model_path, "rb") as f:
        checkpoint_sha256 = hashlib.sha256(f.read()).hexdigest()
    index_data = {
        "embeddings": np.concatenate(embeddings),
        "metadata": metadata,
        "info": {
            "model": "dual-view DINOv2 (ViT-S/14)",
            "embedding_dim": int(embeddings[0].shape[1]),
            "checkpoint_sha256": checkpoint_sha256,
            "samples_per_pair": samples_per_pair,
            "seed": seed,
            "crop": "mask-based screw crop, 2x the screw's largest bounding-box side, +/-5 px jitter",
            "created": datetime.date.today().isoformat(),
        },
    }
    with open(output_path, "wb") as f:
        pickle.dump(index_data, f)
    patients = len({m["patient_number"] for m in metadata})
    print(f"Indexed {len(metadata)} embeddings from {patients} patients "
          f"({skipped_patients} skipped without a usable AP and lateral image) -> {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--data_dir", required=True, help="Folder containing metadata_summary.csv")
    parser.add_argument("--model_path", required=True, help="dinov2_dual_view.pth")
    parser.add_argument("--output_path", default="dinov2_embeddings.pkl")
    parser.add_argument("--samples_per_pair", type=int, default=10,
                        help="Sampled screw-crop pairs per AP x lateral image combination")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--device", default="cpu", choices=["cpu", "cuda", "mps"])
    parser.add_argument("--batch_size", type=int, default=64)
    args = parser.parse_args()
    index_dataset(args.data_dir, args.model_path, args.output_path, args.samples_per_pair,
                  args.seed, args.device, args.batch_size)
