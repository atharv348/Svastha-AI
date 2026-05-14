import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from PIL import Image
import pandas as pd
from sklearn.model_selection import train_test_split
import sys

# Add project root to path to import src modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.model import get_model

class HAM10000Dataset(Dataset):
    def __init__(self, df, transform=None):
        self.df = df
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        img_path = self.df.iloc[idx]['path']
        image = Image.open(img_path).convert('RGB')
        label = int(self.df.iloc[idx]['label_idx'])
        
        if self.transform:
            image = self.transform(image)
            
        return image, label

def train_model(data_dir, epochs=5, batch_size=32, lr=0.001):
    """
    Train model on HAM10000 dataset
    """
    # 1. Load metadata
    metadata_path = os.path.join(data_dir, 'HAM10000_metadata.csv')
    if not os.path.exists(metadata_path):
        print(f"Metadata not found at {metadata_path}. Please download HAM10000 dataset.")
        return

    df = pd.read_csv(metadata_path)
    
    # 2. Map image_id to path
    image_paths = {}
    for folder in ['HAM10000_images_part_1', 'HAM10000_images_part_2']:
        folder_path = os.path.join(data_dir, folder)
        if os.path.exists(folder_path):
            for filename in os.listdir(folder_path):
                if filename.endswith('.jpg'):
                    image_id = filename.split('.')[0]
                    image_paths[image_id] = os.path.join(folder_path, filename)
    
    df['path'] = df['image_id'].map(image_paths.get)
    
    # Drop rows without image paths
    df = df.dropna(subset=['path'])
    print(f"Total images found: {len(df)}")
    
    # 3. Map labels to indices
    lesion_type_dict = {
        'nv': 'Melanocytic nevi',
        'mel': 'Melanoma',
        'bkl': 'Benign keratosis-like lesions',
        'bcc': 'Basal cell carcinoma',
        'akiec': 'Actinic keratoses',
        'vasc': 'Vascular lesions',
        'df': 'Dermatofibroma'
    }
    
    df['cell_type'] = df['dx'].map(lesion_type_dict.get)
    df['label_idx'] = pd.Categorical(df['dx']).codes
    
    # Save the label mapping for reference
    label_map = dict(enumerate(pd.Categorical(df['dx']).categories))
    print(f"Label Mapping: {label_map}")
    
    # 4. Split data
    train_df, val_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df['label_idx'])
    
    # 5. Transforms
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    # 6. DataLoaders
    train_dataset = HAM10000Dataset(train_df, transform=train_transform)
    val_dataset = HAM10000Dataset(val_df, transform=val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    
    # 7. Initialize Model
    num_classes = len(label_map)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    model = get_model(num_classes=num_classes).to(device)
    
    # 8. Loss and Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    
    # 9. Training Loop
    print("Starting training...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item() * inputs.size(0)
            
        epoch_loss = running_loss / len(train_dataset)
        
        # Validation
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
        
        val_acc = 100 * correct / total
        print(f"Epoch {epoch+1}/{epochs} | Loss: {epoch_loss:.4f} | Val Acc: {val_acc:.2f}%")
        
    # 10. Save Model
    os.makedirs('models', exist_ok=True)
    torch.save(model.state_dict(), 'models/skin_lesion_model.pth')
    print("Model saved to models/skin_lesion_model.pth")

if __name__ == "__main__":
    DATA_DIR = r"C:\Users\devil\Downloads\Datasets\HAM10000"
    train_model(data_dir=DATA_DIR, epochs=5)
