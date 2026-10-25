"""Cheap, classical photo check (no AI): is the photo clearly unusable?"""
import cv2
import numpy as np

# Calibrated on VizWiz validation images (see docs/failure_log.md).
BLUR_BLOCK = 8.0       # Laplacian variance below this = nothing sharp at all
DARK_BLOCK = 25.0      # mean brightness (0-255) below this = practically black
BLUR_WARN = 40.0
BLUR_SOFT = 60.0       # about the 25th percentile of 300 VizWiz photos: the answer should not sound sure
DARK_WARN = 55.0


def check(image_bytes: bytes) -> dict:
    """Return {ok, blocking, soft, reasons, blur_score, brightness}.

    soft=True means the photo is on the weak side: answers should not sound fully sure.

    blocking=True means we recommend a retake before asking the model.
    """
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return {"ok": False, "blocking": True, "soft": True, "reasons": ["Could not read this image."],
                "blur_score": 0.0, "brightness": 0.0}
    h, w = img.shape
    scale = 768 / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    blur = float(cv2.Laplacian(img, cv2.CV_64F).var())
    brightness = float(img.mean())

    reasons, blocking = [], False
    if blur < BLUR_BLOCK:
        reasons.append("The photo is very blurry."); blocking = True
    elif blur < BLUR_WARN:
        reasons.append("The photo is a bit blurry.")
    if brightness < DARK_BLOCK:
        reasons.append("The photo is almost completely dark."); blocking = True
    elif brightness < DARK_WARN:
        reasons.append("The photo is quite dark.")
    soft = blur < BLUR_SOFT or brightness < DARK_WARN
    return {"ok": not reasons, "blocking": blocking, "soft": soft, "reasons": reasons,
            "blur_score": round(blur, 1), "brightness": round(brightness, 1)}
