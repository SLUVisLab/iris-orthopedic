import argparse
import json
import os
import sys
from collections import Counter

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Subset, WeightedRandomSampler
from torchvision import transforms

# Add training/ to path for utils, and ml/model/ for the model definition
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '..', 'model'))

import matplotlib.pyplot as plt
from original_model import DualViewClassifier
from utils.dataset import ScrewDataset, collate_fn


# --- Advanced Training Helpers ---
def mixup_data(x1, x2, y, device, alpha=1.0):
    '''Returns mixed inputs, pairs of targets, and lambda'''
    if alpha > 0:
        lam = np.random.beta(alpha, alpha)
    else:
        lam = 1

    batch_size = x1.size(0)
    index = torch.randperm(batch_size).to(device)

    mixed_x1 = lam * x1 + (1 - lam) * x1[index, :]
    mixed_x2 = lam * x2 + (1 - lam) * x2[index, :]
    y_a, y_b = y, y[index]
    return mixed_x1, mixed_x2, y_a, y_b, lam

def mixup_criterion(criterion, pred, y_a, y_b, lam):
    return lam * criterion(pred, y_a) + (1 - lam) * criterion(pred, y_b)

class LabelSmoothingCrossEntropy(nn.Module):
    def __init__(self, eps=0.1, reduction='mean'):
        super(LabelSmoothingCrossEntropy, self).__init__()
        self.eps = eps
        self.reduction = reduction

    def forward(self, output, target):
        c = output.size()[-1]
        log_preds = torch.nn.functional.log_softmax(output, dim=-1)
        if self.reduction == 'sum':
            loss = -log_preds.sum(dim=-1)
        else:
            loss = -log_preds.sum(dim=-1)
            if self.reduction == 'mean':
                loss = loss.mean()
        return loss * self.eps / c + (1 - self.eps) * torch.nn.functional.nll_loss(log_preds, target, reduction=self.reduction)


def main():
    parser = argparse.ArgumentParser(description='Train Original Classifier')
    parser.add_argument('--data_dir', type=str, required=True, help='Path to dataset directory')
    args = parser.parse_args()

    # --- Configuration (Best Params from Optuna) ---
    CSV_PATH = os.path.join(args.data_dir, 'metadata_summary.csv')
    ROOT_DIR = args.data_dir
    BATCH_SIZE = 128 
    EPOCHS = 100
    
    # Best Hyperparameters
    LR = 0.000387403
    WEIGHT_DECAY = 6.7452e-05
    STEP_SIZE = 8
    GAMMA = 0.1
    LABEL_SMOOTHING = 0.042239
    MIXUP_ALPHA = 0.239336
    
    # Device
    if torch.cuda.is_available():
        device = torch.device('cuda')
    elif torch.backends.mps.is_available():
        device = torch.device('mps')
    else:
        device = torch.device('cpu')
    print(f"Using device: {device}")
    
    # --- Data Loading ---
    print("Loading metadata...")
    df = pd.read_csv(CSV_PATH)
    df = df[~df['manufacturer'].isin(['No Accession Number Match', 'No manufacturer data'])]
    
    EXPLICIT_DROP = ['Styker everest (K2M)', 'orthofix firebird']
    if EXPLICIT_DROP:
        df = df[~df['manufacturer'].isin(EXPLICIT_DROP)]
        
    MIN_PATIENTS = 10
    counts = df.groupby('manufacturer')['patient_number'].nunique()
    drop_classes = counts[counts < MIN_PATIENTS].index.tolist()
    if drop_classes:
        print(f"Dropping manufacturers with < {MIN_PATIENTS} patients: {drop_classes}")
        df = df[~df['manufacturer'].isin(drop_classes)]
    
    manufacturers = sorted(df['manufacturer'].unique())
    class_to_idx = {m: i for i, m in enumerate(manufacturers)}
    num_classes = len(manufacturers)
    print(f"Classes: {manufacturers}")
    
    # Patient Split
    patients = df['patient_number'].unique()
    patient_labels = df.groupby('patient_number')['manufacturer'].first()
    train_patients, test_patients = train_test_split(
        patients, test_size=0.2, random_state=42, stratify=patient_labels
    )
    
    train_df = df[df['patient_number'].isin(train_patients)]
    test_df = df[df['patient_number'].isin(test_patients)]
    print(f"Train patients: {len(train_patients)}, Test patients: {len(test_patients)}")
    
    # Transforms
    train_transform = transforms.Compose([
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
    
    test_transform = transforms.Compose([
        transforms.Resize((400, 400)),
        transforms.CenterCrop((224, 224)),
        transforms.Grayscale(num_output_channels=3),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # Datasets
    train_dataset = ScrewDataset(train_df, ROOT_DIR, transform=train_transform)
    test_dataset = ScrewDataset(test_df, ROOT_DIR, transform=test_transform, samples_per_patient=10)
    
    # Weighted Sampler
    train_labels = []
    for pid in train_dataset.patient_ids:
        m = train_df[train_df['patient_number'] == pid]['manufacturer'].iloc[0]
        train_labels.append(class_to_idx[m])
    
    class_counts = Counter(train_labels)
    class_weights = {cls: 1.0 / count for cls, count in class_counts.items()}
    sample_weights = [class_weights[lbl] for lbl in train_labels]
    
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
    
    # Loaders
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, sampler=sampler, collate_fn=collate_fn, num_workers=4)
    
    # Model
    model = DualViewClassifier(num_classes=num_classes).to(device)
    
    # Loss with Label Smoothing
    if LABEL_SMOOTHING > 0.0:
        print(f"Using Label Smoothing: {LABEL_SMOOTHING}")
        criterion = LabelSmoothingCrossEntropy(eps=LABEL_SMOOTHING)
    else:
        criterion = nn.CrossEntropyLoss()
        
    optimizer = optim.Adam(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=STEP_SIZE, gamma=GAMMA)

    # --- Training Loop ---
    train_losses = []
    train_accs = []
    test_losses = []
    test_accs = []
    
    best_acc = 0.0

    print("Starting training...")
    for epoch in range(EPOCHS):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, batch in enumerate(train_loader):
            if not batch: 
                continue
                
            ap_imgs, lat_imgs, labels = batch
            ap_imgs, lat_imgs, labels = ap_imgs.to(device), lat_imgs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            
            # Mixup Logic
            if MIXUP_ALPHA > 0.0:
                batch_size = ap_imgs.size(0)
                index = torch.randperm(batch_size).to(device)
                lam = np.random.beta(MIXUP_ALPHA, MIXUP_ALPHA)
                
                mixed_ap = lam * ap_imgs + (1 - lam) * ap_imgs[index, :]
                mixed_lat = lam * lat_imgs + (1 - lam) * lat_imgs[index, :]
                
                y_a, y_b = labels, labels[index]
                
                outputs = model(mixed_ap, mixed_lat)
                loss = mixup_criterion(criterion, outputs, y_a, y_b, lam)
            else:
                outputs = model(ap_imgs, lat_imgs)
                loss = criterion(outputs, labels)
                
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            
            if batch_idx % 10 == 0:
                print(f"Epoch {epoch+1}, Batch {batch_idx}: Loss {loss.item():.4f}")

        if total > 0:
            train_acc = 100 * correct / total
            epoch_loss = running_loss/len(train_loader)
            train_losses.append(epoch_loss)
            train_accs.append(train_acc)
            print(f"Epoch {epoch+1} Results: Loss: {epoch_loss:.4f}, Train Acc: {train_acc:.2f}%")
        
        scheduler.step()
        
        # --- Balanced Evaluation ---
        test_acc, test_loss = evaluate_balanced(model, test_dataset, device, epoch, criterion)
        test_accs.append(test_acc)
        test_losses.append(test_loss)
        
        # Save Best Model
        if test_acc > best_acc:
            best_acc = test_acc
            torch.save(model.state_dict(), 'original_classifier_best.pth')
            print(f"New best accuracy: {best_acc:.2f}%. Model saved to original_classifier_best.pth")

    # --- Plotting ---
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(train_accs, label='Train Acc')
    plt.plot(test_accs, label='Test Acc')
    plt.title('Accuracy over Epochs')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy (%)')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    plt.plot(train_losses, label='Train Loss')
    plt.plot(test_losses, label='Test Loss')
    plt.title('Loss over Epochs')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    
    plt.tight_layout()
    plt.savefig('training_results.png')
    print("Training plot saved to training_results.png")
    
    # Save Metrics
    metrics = {
        'train_loss': train_losses,
        'train_acc': train_accs,
        'test_loss': test_losses,
        'test_acc': test_accs
    }
    with open('metrics.json', 'w') as f:
        json.dump(metrics, f)
    print("Metrics saved to metrics.json")

    torch.save(model.state_dict(), 'original_classifier.pth')
    print("Model saved to original_classifier.pth")

def evaluate_balanced(model, test_dataset, device, epoch, criterion):
    """Evaluates the model on a balanced subset of the test set."""
    model.eval()
    
    class_indices = {}
    for idx in range(len(test_dataset)):
        patient_idx = idx // test_dataset.samples_per_patient
        pid = test_dataset.patient_ids[patient_idx]
        group = test_dataset.patient_groups.get_group(pid)
        manufacturer = group['manufacturer'].iloc[0]
        label = test_dataset.class_to_idx[manufacturer]
        
        if label not in class_indices:
            class_indices[label] = []
        class_indices[label].append(idx)
    
    if not class_indices:
        print("Test set is empty.")
        return 0.0, 0.0

    min_count = min(len(idxs) for idxs in class_indices.values())
    print(f"Evaluating on balanced subset: {min_count} samples per class.")
    
    if min_count == 0:
        print("Warning: One or more classes have 0 samples in test set.")
        return 0.0, 0.0

    balanced_indices = []
    for label in class_indices:
        balanced_indices.extend(np.random.choice(class_indices[label], min_count, replace=False))
    
    subset = Subset(test_dataset, balanced_indices)
    loader = DataLoader(subset, batch_size=16, shuffle=False, collate_fn=collate_fn)
    
    correct = 0
    total = 0
    running_loss = 0.0
    
    with torch.no_grad():
        for batch in loader:
            if not batch: continue
            ap_imgs, lat_imgs, labels = batch
            ap_imgs, lat_imgs, labels = ap_imgs.to(device), lat_imgs.to(device), labels.to(device)
            
            outputs = model(ap_imgs, lat_imgs)
            loss = criterion(outputs, labels)
            running_loss += loss.item()
            
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            
    avg_loss = running_loss / len(loader) if len(loader) > 0 else 0.0
    
    if total > 0:
        acc = 100 * correct / total
        print(f"Epoch {epoch+1} Balanced Test Acc: {acc:.2f}%, Loss: {avg_loss:.4f}")
        return acc, avg_loss
    else:
        print(f"Epoch {epoch+1} Balanced Test Acc: N/A (No valid pairs found)")
        return 0.0, 0.0

if __name__ == '__main__':
    main()
