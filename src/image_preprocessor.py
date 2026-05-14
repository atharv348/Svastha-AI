import cv2
import numpy as np
from PIL import Image

def detect_roi(image_cv):
    """
    Detect Region of Interest (ROI) using contours
    """
    gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
    
    # Adaptive thresholding to find the main object
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
    
    # Morphological operations to clean up the mask
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if not contours:
        return image_cv
        
    # Get the largest contour (assumed to be the lesion/organ)
    c = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(c)
    
    # Add some padding
    padding = 20
    x = max(0, x - padding)
    y = max(0, y - padding)
    w = min(image_cv.shape[1] - x, w + 2 * padding)
    h = min(image_cv.shape[0] - y, h + 2 * padding)
    
    return image_cv[y:y+h, x:x+w]

def preprocess_for_diagnosis(image: Image.Image):
    """
    Preprocess medical image using OpenCV and standard transforms
    """
    # 1. Convert PIL to OpenCV format
    img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    
    # 2. ROI Detection (Functional Requirement 3 & 4)
    img_cv = detect_roi(img_cv)
    
    # 3. Resize
    img_cv = cv2.resize(img_cv, (224, 224))
    
    # 4. Noise Removal (Gaussian Blur)
    img_cv = cv2.GaussianBlur(img_cv, (5, 5), 0)
    
    # 5. Contrast Enhancement (CLAHE)
    lab = cv2.cvtColor(img_cv, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    img_cv = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
    
    # 6. Convert back to PIL
    img_pil = Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))
    
    # 7. Normalize using numpy (ImageNet mean/std)
    img_array = np.array(img_pil).astype(np.float32) / 255.0
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    img_array = (img_array - mean) / std
    # Return as (1, C, H, W) shaped numpy array (batch dimension added)
    return img_array.transpose(2, 0, 1)[np.newaxis, ...]
