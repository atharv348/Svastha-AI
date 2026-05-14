import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, datasets
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.model import get_model

def train_lungs_model(data_dir, epochs=5, batch_size=32, lr=0.001):
    """
    Train model on Chest X-Ray (Pneumonia) dataset
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Lungs Model - Using device: {device}")

    # 1. Transforms
    data_transforms = {
        'train': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.Grayscale(num_output_channels=3),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.Grayscale(num_output_channels=3),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
    }

    # 2. DataLoaders (Chest X-ray has train/val/test folders)
    image_datasets = {x: datasets.ImageFolder(os.path.join(data_dir, x), data_transforms[x if x != 'test' else 'val'])
                      for x in ['train', 'val', 'test']}
    
    dataloaders = {x: DataLoader(image_datasets[x], batch_size=batch_size, shuffle=True if x == 'train' else False)
                   for x in ['train', 'val', 'test']}
    
    class_names = image_datasets['train'].classes
    print(f"Classes found: {class_names}")

    # 3. Model
    model = get_model(num_classes=len(class_names)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)

    # 4. Training
    print("Starting Lungs Model training...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        for inputs, labels in dataloaders['train']:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * inputs.size(0)
        
        epoch_loss = running_loss / len(image_datasets['train'])
        
        # Simple Validation
        model.eval()
        correct = 0
        with torch.no_grad():
            for inputs, labels in dataloaders['val']:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                correct += torch.sum(preds == labels.data)
        
        val_acc = correct.double() / len(image_datasets['val'])
        print(f"Epoch {epoch+1}/{epochs} | Loss: {epoch_loss:.4f} | Val Acc: {val_acc:.2f}")

    # 5. Save
    os.makedirs('models', exist_ok=True)
    torch.save(model.state_dict(), 'models/lungs_model.pth')
    print("Model saved to models/lungs_model.pth")

if __name__ == "__main__":
    LUNGS_DATA = r"C:\Users\devil\Downloads\Datasets\ChestXray\chest_xray"
    if os.path.exists(LUNGS_DATA):
        train_lungs_model(LUNGS_DATA)
    else:
        print(f"Data path not found: {LUNGS_DATA}")
