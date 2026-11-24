from pathlib import Path
from typing import Dict, Any
import cv2
import numpy as np
from PIL import Image, ImageOps


def normalize_and_analyze_image(image_path: Path) -> Dict[str, Any]:
    """
    Loads an architectural raster image safely (applying EXIF orientation correction),
    performs OpenCV preprocessing + Hough line & contour extraction, and returns
    structural telemetry without inventing physical measurements.
    """
    # Fix EXIF rotation using Pillow first
    with Image.open(image_path) as pil_img:
        pil_img = ImageOps.exif_transpose(pil_img)
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")
        pil_img.save(image_path)
        width_px, height_px = pil_img.size

    img = cv2.imread(str(image_path))
    if img is None:
        return {
            "width_px": width_px,
            "height_px": height_px,
            "wall_lines_detected": 0,
            "room_contours_detected": 0,
            "orientation": "landscape" if width_px >= height_px else "portrait",
            "cv_confidence": 0.0,
            "reliable_geometry": False,
        }

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Resize down for fast deterministic CV feature extraction while keeping aspect ratio
    max_dim = 1200
    scale = min(1.0, max_dim / max(gray.shape[0], gray.shape[1]))
    if scale < 1.0:
        gray = cv2.resize(gray, (int(gray.shape[1] * scale), int(gray.shape[0] * scale)))

    # Contrast & denoising
    blurred = cv2.GaussianBlur(gray, (3, 3), 0)
    thresh = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 6
    )

    # Morphological closing to isolate thick architectural wall strokes
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

    # Detect line segments (walls / partition edges)
    lines = cv2.HoughLinesP(closed, rho=1, theta=np.pi / 180, threshold=60, minLineLength=35, maxLineGap=12)
    wall_lines = int(len(lines)) if lines is not None else 0

    # Detect enclosed room candidate contours
    contours, _ = cv2.findContours(cv2.bitwise_not(closed), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    img_area = gray.shape[0] * gray.shape[1]
    room_candidates = [
        c for c in contours if 0.015 * img_area < cv2.contourArea(c) < 0.65 * img_area
    ]

    aspect = round(width_px / max(1, height_px), 3)
    # Evaluate whether CV extracted enough structured lines to attempt parametric mapping
    reliable = wall_lines >= 12 and len(room_candidates) >= 2
    confidence = round(min(0.95, 0.35 + min(wall_lines, 120) / 240.0 + min(len(room_candidates), 10) / 30.0), 2)

    return {
        "width_px": width_px,
        "height_px": height_px,
        "aspect_ratio": aspect,
        "orientation": "landscape" if width_px >= height_px else "portrait",
        "wall_lines_detected": wall_lines,
        "room_contours_detected": len(room_candidates),
        "cv_confidence": confidence,
        "reliable_geometry": reliable,
    }
