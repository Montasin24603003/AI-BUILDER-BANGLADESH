"""
Module A: Image Preprocessing Pipeline using OpenCV (cv2)
Handles denoising, adaptive thresholding, deskewing, and aspect-preserving resize
for scanned/photographed or CAD-exported architectural floor plans.
"""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Tuple, Dict, Any
import math

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None  # type: ignore
    np = None  # type: ignore


@dataclass
class PreprocessConfig:
    target_size: Tuple[int, int] = (1024, 1024)
    denoise_h: float = 10.0
    adaptive_block_size: int = 25
    adaptive_c: int = 8
    deskew_enabled: bool = True


def deskew_floorplan(gray: "np.ndarray") -> Tuple["np.ndarray", float]:
    """Estimate dominant orthogonal wall angle via Hough lines and deskew."""
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)
    lines = cv2.HoughLinesP(edges, 1, math.pi / 180.0, threshold=100, minLineLength=60, maxLineGap=10)
    if lines is None or len(lines) == 0:
        return gray, 0.0

    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
        # Fold angle into [-45, 45] around orthogonal axes
        folded = ((angle + 45) % 90) - 45
        if abs(folded) < 15.0:
            angles.append(folded)

    if not angles:
        return gray, 0.0

    median_angle = float(np.median(angles))
    if abs(median_angle) < 0.15:
        return gray, 0.0

    h, w = gray.shape[:2]
    center = (w // 2, h // 2)
    rot_mat = cv2.getRotationMatrix2D(center, median_angle, 1.0)
    rotated = cv2.warpAffine(gray, rot_mat, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated, round(median_angle, 3)


def letterbox_resize(img: "np.ndarray", target_size: Tuple[int, int]) -> Tuple["np.ndarray", Dict[str, Any]]:
    """Resize image preserving aspect ratio with white letterbox padding."""
    tw, th = target_size
    h, w = img.shape[:2]
    scale = min(tw / float(w), th / float(h))
    nw, nh = int(round(w * scale)), int(round(h * scale))
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)

    pad_w = tw - nw
    pad_h = th - nh
    top, bottom = pad_h // 2, pad_h - (pad_h // 2)
    left, right = pad_w // 2, pad_w - (pad_w // 2)

    border_val = [255, 255, 255] if img.ndim == 3 else 255
    padded = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=border_val)
    meta = {
        "orig_width": w,
        "orig_height": h,
        "target_width": tw,
        "target_height": th,
        "scale_factor": round(scale, 6),
        "pad_left": left,
        "pad_top": top,
    }
    return padded, meta


def preprocess_floorplan_image(
    image_path: str | Path,
    output_dir: str | Path,
    config: PreprocessConfig = PreprocessConfig(),
) -> Dict[str, Any]:
    """Full OpenCV preprocessing stage producing normalized RGB, grayscale, and binary wall mask candidate."""
    if cv2 is None:
        raise RuntimeError("opencv-python (cv2) is required to run preprocess_floorplan_image.")

    src_path = Path(image_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    bgr = cv2.imread(str(src_path), cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError(f"Could not read floor plan image: {src_path}")

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, None, config.denoise_h, 7, 21)

    skew_deg = 0.0
    if config.deskew_enabled:
        denoised, skew_deg = deskew_floorplan(denoised)

    padded_bgr, letterbox_meta = letterbox_resize(bgr, config.target_size)
    padded_gray, _ = letterbox_resize(denoised, config.target_size)

    binary = cv2.adaptiveThreshold(
        padded_gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        config.adaptive_block_size,
        config.adaptive_c,
    )

    norm_out = out_dir / f"{src_path.stem}_norm.png"
    bin_out = out_dir / f"{src_path.stem}_binary.png"
    cv2.imwrite(str(norm_out), padded_bgr)
    cv2.imwrite(str(bin_out), binary)

    return {
        "source_file": str(src_path),
        "normalized_image": str(norm_out),
        "binary_edge_image": str(bin_out),
        "skew_corrected_deg": skew_deg,
        **letterbox_meta,
    }
