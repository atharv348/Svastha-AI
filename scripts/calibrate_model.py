import cv2
import numpy as np
import os

def get_features(path):
    if not os.path.exists(path):
        return None
    img = cv2.imread(path)
    if img is None:
        return None
    # Calculate average RGB and brightness
    b, g, r = cv2.mean(img)[:3]
    brightness = (r + g + b) / 3
    # Ratios
    r_ratio = r / (g + 1e-6)
    g_ratio = g / (b + 1e-6)
    return {
        "r": round(r, 2),
        "g": round(g, 2),
        "b": round(b, 2),
        "brightness": round(brightness, 2),
        "r_ratio": round(r_ratio, 2),
        "g_ratio": round(g_ratio, 2)
    }

base_path = r"C:\Users\devil\Desktop"
images = {
    "sad": "sad.jpeg",
    "neutral": "neutral.jpeg",
    "happy": "happy.jpeg",
    "angry": "angry.jpeg"
}

calibration = {}
for mood, filename in images.items():
    path = os.path.join(base_path, filename)
    features = get_features(path)
    if features:
        calibration[mood] = features

print("CALIBRATION_DATA = " + str(calibration))
