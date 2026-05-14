import torch
import torch.nn as nn
import torchvision.models as models

def get_model(num_classes=7, model_name='mobilenet_v2'):
    """
    Load a pre-trained model and modify the final layer
    """
    if model_name == 'mobilenet_v2':
        model = models.mobilenet_v2(pretrained=True)
        # Modify the classifier to match our number of classes
        model.classifier[1] = nn.Linear(model.last_channel, num_classes)
    elif model_name == 'resnet50':
        model = models.resnet50(pretrained=True)
        num_ftrs = model.fc.in_features
        model.fc = nn.Linear(num_ftrs, num_classes)
    else:
        raise ValueError(f"Model {model_name} not supported")
        
    return model
