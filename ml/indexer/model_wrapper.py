import os
import sys

import torch
from PIL import Image
from torchvision import transforms

# Add ml/model/ to path for the shared model definition
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'model'))

from original_model import DualViewClassifier


class ClassifierWrapper:
    def __init__(self, model_path, device='cpu'):
        self.device = torch.device(device)
        self.num_classes = 4
        
        # Initialize model
        self.model = DualViewClassifier(num_classes=self.num_classes)
        
        # Load weights
        if os.path.exists(model_path):
            state_dict = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(state_dict)
            print(f"Loaded model from {model_path}")
        else:
            print(f"Warning: Model file not found at {model_path}. Running with random weights.")
            
        self.model.to(self.device)
        self.model.eval()
        
        # Canonical transform (no augmentation)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.Resize((224, 224)),
            transforms.Grayscale(num_output_channels=3),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        # Augmentation transforms (mirrors training augmentations)
        self.augment_transform = transforms.Compose([
            transforms.Resize((400, 400)),
            transforms.RandomRotation(15), 
            transforms.CenterCrop((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(), 
            transforms.ColorJitter(brightness=0.3, contrast=0.3),
            transforms.Grayscale(num_output_channels=3),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
    def preprocess(self, image_bytes_ap, image_bytes_lat, augment=False):
        """Converts raw bytes to tensors."""
        import io
        img_ap = Image.open(io.BytesIO(image_bytes_ap)).convert('RGB')
        img_lat = Image.open(io.BytesIO(image_bytes_lat)).convert('RGB')
        
        transform = self.augment_transform if augment else self.transform
        
        t_ap = transform(img_ap).unsqueeze(0).to(self.device)
        t_lat = transform(img_lat).unsqueeze(0).to(self.device)
        
        return t_ap, t_lat

    def predict(self, image_bytes_ap, image_bytes_lat, augment=False):
        """
        Returns:
            - probs: numpy array of class probabilities
            - embedding: 1024-dim numpy array
        """
        t_ap, t_lat = self.preprocess(image_bytes_ap, image_bytes_lat, augment=augment)
        
        with torch.no_grad():
            feat_ap = self.model.backbone_ap(t_ap)
            feat_lat = self.model.backbone_lat(t_lat)
            combined = torch.cat((feat_ap, feat_lat), dim=1)
            logits = self.model.classifier(combined)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            embedding = combined.cpu().numpy()[0]
            
        return probs, embedding
