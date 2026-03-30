---
title: Orthopedic Screw Identification
emoji: 🔩
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: "5.23.0"
app_file: app.py
pinned: false
short_description: Identify orthopedic screw manufacturers from X-ray images
models:
  - austin-carnahan/orthopedic-screws-model
datasets:
  - austin-carnahan/orthopedic-screw-images
tags:
  - medical-imaging
  - classification
  - orthopedic
preload_from_hub:
  - austin-carnahan/orthopedic-screws-model original_classifier_best.pth,embeddings.pkl
---

# Orthopedic Screw Identification

Upload AP and Lateral X-ray views of a pedicle screw to identify the manufacturer.

**Model**: Dual-view ResNet18 classifier trained on labeled X-ray data.

**Returns**: Ranked manufacturer predictions with confidence scores and similar reference cases from the training set.

## Running Locally

```bash
cd ml/space

# Install dependencies
pip install -r requirements.txt

# Copy shared model code into this directory
cp ../model/original_model.py .
cp ../model/model_wrapper.py .

# Launch the Gradio app
python app.py
```

The app will be available at `http://localhost:7860`.

## Deploying to Hugging Face

Use the deploy script from the repo root:

```bash
bash ml/scripts/deploy-space.sh
```

This assembles the space bundle (copying shared model files) and pushes to the HF Space repo. See [ml/scripts/](../scripts/) for details.

## API Reference

The Space exposes a `/predict` endpoint via Gradio. The mobile app calls it using the `@gradio/client` library.

### Request

```javascript
import { Client, handle_file } from '@gradio/client';

const client = await Client.connect('austin-carnahan/orthopedic-screw-identification');
const result = await client.predict('/predict', {
  ap_editor: {
    background: handle_file(apBlob),
    layers: [],
    composite: handle_file(apBlob),     // cropped AP image as Blob
  },
  lat_editor: {
    background: handle_file(latBlob),
    layers: [],
    composite: handle_file(latBlob),    // cropped Lateral image as Blob
  },
});
```

The `composite` field is the one the model actually reads — it should be the cropped image of the screw.

### Response

The response is a JSON object with a `results` array, sorted by confidence (highest first).
Each entry contains the manufacturer prediction, confidence score, and up to 3 similar reference
cases from the training set (one per unique patient, ranked by cosine similarity).

```json
{
  "results": [
    {
      "manufacturer": "seaspine mariner",
      "confidence": 0.351,
      "similar": [
        {
          "manufacturer": "seaspine mariner",
          "score": 0.765,
          "ap_url": "https://huggingface.co/datasets/austin-carnahan/orthopedic-screw-images/resolve/main/data/seaspine mariner/115300834/images/115300834_02.jpg",
          "lat_url": "https://huggingface.co/datasets/austin-carnahan/orthopedic-screw-images/resolve/main/data/seaspine mariner/115300834/images/115300834_01.jpg"
        },
        {
          "manufacturer": "seaspine mariner",
          "score": 0.746,
          "ap_url": "https://...",
          "lat_url": "https://..."
        }
      ]
    },
    {
      "manufacturer": "medtronic solera",
      "confidence": 0.283,
      "similar": [ ... ]
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `manufacturer` | string | Manufacturer class name |
| `confidence` | float | Softmax probability (0–1) |
| `similar[].score` | float | Cosine similarity against embedding index (0–1) |
| `similar[].ap_url` | string | Direct URL to the reference AP image in the HF dataset repo |
| `similar[].lat_url` | string | Direct URL to the reference Lateral image in the HF dataset repo |

## How It Works

1. User uploads AP and Lateral X-ray images and crops each to the screw of interest.
2. Images are preprocessed (resize to 224×224, grayscale→3ch, ImageNet normalization).
3. Each view passes through its own ResNet18 backbone, producing a 512-dim feature vector.
4. The two vectors are concatenated into a 1024-dim embedding.
5. A fusion classifier head outputs logits over 4 manufacturer classes.
6. Softmax converts logits to confidence scores.
7. Cosine similarity against a pre-built embedding index finds the most similar reference cases for each manufacturer.

## Configuration

Key constants in `app.py`:

| Variable | Description |
|---|---|
| `MODEL_REPO` | HF model repo containing weights and embedding index |
| `DATASET_REPO` | HF dataset repo for reference image URLs |
| `MODEL_FILENAME` | Weights file name (`.pth`) |
| `INDEX_FILENAME` | Embedding index file name (`.pkl`) |
| `CLASSES` | Manufacturer class names (must match training order) |
