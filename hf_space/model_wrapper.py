import io
import os

import torch
from original_model import DualViewClassifier
from PIL import Image
from torchvision import transforms


class ClassifierWrapper:
    def __init__(self, model_path, device="cpu"):
        self.device = torch.device(device)
        self.num_classes = 4  # Hardcoded based on known classes

        # Initialize model
        self.model = DualViewClassifier(num_classes=self.num_classes)

        # Load weights
        if os.path.exists(model_path):
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            print(f"Loaded model from {model_path}")
        else:
            print(f"Warning: Model file not found at {model_path}.")

        self.model.to(self.device)
        self.model.eval()

        # Inference transform (matches old backend)
        self.transform = transforms.Compose(
            [
                transforms.Resize((224, 224)),
                transforms.Grayscale(num_output_channels=3),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
                ),
            ]
        )

    def preprocess_pil(self, img_ap: Image.Image, img_lat: Image.Image):
        """Converts PIL images to tensors."""
        t_ap = self.transform(img_ap.convert("RGB")).unsqueeze(0).to(self.device)
        t_lat = self.transform(img_lat.convert("RGB")).unsqueeze(0).to(self.device)
        return t_ap, t_lat

    def predict_pil(self, img_ap: Image.Image, img_lat: Image.Image):
        """
        Accepts PIL images (Gradio gives us these directly).
        Returns:
            - probs: numpy array of class probabilities
            - embedding: 1024-dim numpy array
        """
        t_ap, t_lat = self.preprocess_pil(img_ap, img_lat)

        with torch.no_grad():
            feat_ap = self.model.backbone_ap(t_ap)
            feat_lat = self.model.backbone_lat(t_lat)
            combined = torch.cat((feat_ap, feat_lat), dim=1)
            logits = self.model.classifier(combined)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            embedding = combined.cpu().numpy()[0]

        return probs, embedding
