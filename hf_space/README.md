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
