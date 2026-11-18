"""Dual-view DINOv2 manufacturer classifier matching the released weights."""
from pathlib import Path
import sys
import torch
from torch import nn

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "vendor" / "dinov2"))
from dinov2.hub.backbones import dinov2_vits14

CLASSES = ["Depuy expedium (Synthes)", "medtronic solera", "nuvasive reline", "seaspine mariner"]


class DualViewDINOv2(nn.Module):
    def __init__(self, initialize_backbone=True):
        super().__init__()
        self.backbone = dinov2_vits14(pretrained=False)
        if initialize_backbone:
            weights = torch.load(ROOT / "weights" / "dinov2_vits14_pretrain.pth", map_location="cpu", weights_only=True)
            self.backbone.load_state_dict(weights, strict=True)
        self.backbone.requires_grad_(False)
        self.classifier = nn.Sequential(nn.Linear(768, 512), nn.ReLU(), nn.Dropout(0.5), nn.Linear(512, 4))

    def forward(self, ap_imgs, lat_imgs):
        with torch.no_grad():
            ap = self.backbone(ap_imgs)
            lat = self.backbone(lat_imgs)
        return self.classifier(torch.cat((ap, lat), dim=1))


def load_checkpoint(path, device="cpu"):
    checkpoint = torch.load(path, map_location="cpu", weights_only=True)
    if "config" in checkpoint and checkpoint["config"].get("classes") != CLASSES:
        raise ValueError("Checkpoint class order does not match this model.")
    state = checkpoint.get("model_state_dict", checkpoint)
    if "classifier.0.weight" not in state or tuple(state["classifier.0.weight"].shape) != (512, 768):
        raise ValueError("Checkpoint is not the supported dual-view DINOv2 architecture (expected 512 x 768 fusion weights).")
    model = DualViewDINOv2(initialize_backbone=False)
    model.load_state_dict(state, strict=True)
    return model.to(device).eval()
