"""Inference wrapper around the dual-view DINOv2 model, shared by the HF Space and the indexer.

Preprocessing matches the evaluation transform in SLUVisLab/ortho_screw_dinov2
(train.make_transforms(False)): resize to 224x224, grayscale -> 3 channels, ImageNet
normalization. Inputs should be screw-centered crops (about 2x the screw's size).
"""
import torch
from PIL import Image
from torchvision import transforms

from model import CLASSES, load_checkpoint

INFERENCE_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.Grayscale(num_output_channels=3),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


class ClassifierWrapper:
    classes = CLASSES  # class index order of the checkpoint

    def __init__(self, model_path, device="cpu"):
        self.device = torch.device(device)
        # load_checkpoint is strict: it raises if the file is missing or not this architecture
        self.model = load_checkpoint(model_path, device=self.device)
        self.transform = INFERENCE_TRANSFORM
        print(f"Loaded dual-view DINOv2 checkpoint from {model_path}")

    @torch.inference_mode()
    def predict_tensors(self, ap, lat):
        """Batched inference on preprocessed tensors [B, 3, 224, 224].

        Returns (probs [B, 4], embeddings [B, 768]) as numpy arrays. The embedding is the
        concatenated AP and lateral DINOv2 [CLS] features that the classifier head reads.
        """
        ap, lat = ap.to(self.device), lat.to(self.device)
        embedding = torch.cat((self.model.backbone(ap), self.model.backbone(lat)), dim=1)
        probs = torch.softmax(self.model.classifier(embedding), dim=1)
        return probs.cpu().numpy(), embedding.cpu().numpy()

    def preprocess_pil(self, img_ap: Image.Image, img_lat: Image.Image):
        t_ap = self.transform(img_ap.convert("RGB")).unsqueeze(0)
        t_lat = self.transform(img_lat.convert("RGB")).unsqueeze(0)
        return t_ap, t_lat

    def predict_pil(self, img_ap: Image.Image, img_lat: Image.Image):
        """Single AP/lateral pair of PIL crops -> (probs [4], embedding [768])."""
        probs, embedding = self.predict_tensors(*self.preprocess_pil(img_ap, img_lat))
        return probs[0], embedding[0]
