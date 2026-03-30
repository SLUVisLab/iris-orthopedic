# Training & Benchmarking

Code for training and benchmarking orthopedic screw classification models. Three approaches are implemented, all using dual-view (AP + Lateral) X-ray inputs.

## Approaches

1. **Original Classifier (ResNet18)** — `original_classifier/`
   - Two `torchvision.models.resnet18` backbones (pretrained on ImageNet)
   - Feature concatenation fusion → classification head
   - Uses Mixup augmentation and Label Smoothing (hyperparameters tuned via Optuna)
   - **This is the model currently deployed in the app**

2. **Mask R-CNN Classifier** — `maskrcnn_classifier/`
   - Uses `maskrcnn_resnet50_fpn` with segmentation masks
   - Joint detection + classification training

3. **DINOv2 Classifier** — `dinov2_classifier/`
   - **DINOv2 ViT-S/14** (frozen backbone) as feature extractor
   - Trains only a fusion MLP head on the [CLS] tokens

## Dataset

The training data is hosted on Hugging Face:

**Dataset repo:** [`austin-carnahan/orthopedic-screw-images`](https://huggingface.co/datasets/austin-carnahan/orthopedic-screw-images)

Download it using the Hugging Face CLI:

```bash
huggingface-cli download austin-carnahan/orthopedic-screw-images --repo-type dataset --local-dir ./data
```

The dataset expects a `metadata_summary.csv` file with columns:
- `manufacturer` — screw manufacturer name
- `patient_number` — unique patient identifier
- `view_position` — `'AP'` or `'LATERAL'`
- `relative_file_path` — path to the image file relative to the dataset root

## Setup

```bash
cd ml/training

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install torch torchvision scikit-learn pandas matplotlib numpy opencv-python pillow tqdm

# For Optuna hyperparameter optimization
pip install optuna
```

## Running the Benchmark

Run all three models sequentially and generate a comparison plot:

```bash
python run_benchmark.py --data_dir /path/to/dataset
```

### Output
- `original_classifier/metrics.json`
- `maskrcnn_classifier/metrics.json`
- `dinov2_classifier/metrics.json`
- `benchmark_comparison.png` — combined plot of Training Loss and Test Accuracy

## Running Individual Models

```bash
python original_classifier/train.py --data_dir /path/to/dataset
python maskrcnn_classifier/train.py --data_dir /path/to/dataset
python dinov2_classifier/train.py --data_dir /path/to/dataset
```

### Output Artifacts

Training scripts save model weights to the **current working directory**:

| File | Description |
|---|---|
| `original_classifier_best.pth` | Best checkpoint (highest test accuracy) |
| `original_classifier.pth` | Final epoch checkpoint |

These files are gitignored and are **not** committed to the repo. After training,
upload the best checkpoint and a rebuilt embedding index to Hugging Face — see
[After Training](#after-training) below.

## Hyperparameter Optimization

The Optuna optimization script tunes the ResNet18 classifier:

```bash
python optimization/train_optuna.py --data_dir /path/to/dataset --trials 20
```

Results are saved to `best_params.json`.

## After Training

Once you have a trained model (`.pth` file):

1. **Rebuild the embedding index** — see [`ml/indexer/`](../indexer/)
2. **Upload weights to HF** — see [`ml/scripts/deploy-model.sh`](../scripts/deploy-model.sh)
3. **Deploy the updated Space** — see [`ml/scripts/deploy-space.sh`](../scripts/deploy-space.sh)
