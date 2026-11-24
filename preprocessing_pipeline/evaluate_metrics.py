"""
Module F: Evaluation Metrics for Floor Plan Detection, Segmentation & Geometry
Computes:
1. Per-class & Mean Intersection-over-Union (IoU / mIoU) for semantic segmentation.
2. Precision, Recall, and F1-Score for object detection (doors, windows, stairs, columns).
3. Geometric dimensional error (MAE in cm and relative area error %) for extracted rooms/walls.
"""
from __future__ import annotations
from typing import Dict, List, Tuple


def compute_bbox_iou(box_a: List[float], box_b: List[float]) -> float:
    """Compute 2D axis-aligned bounding box IoU for [x1, y1, x2, y2]."""
    x_left = max(box_a[0], box_b[0])
    y_top = max(box_a[1], box_b[1])
    x_right = min(box_a[2], box_b[2])
    y_bottom = min(box_a[3], box_b[3])

    if x_right <= x_left or y_bottom <= y_top:
        return 0.0

    inter = (x_right - x_left) * (y_bottom - y_top)
    area_a = max(0.0, (box_a[2] - box_a[0]) * (box_a[3] - box_a[1]))
    area_b = max(0.0, (box_b[2] - box_b[0]) * (box_b[3] - box_b[1]))
    union = area_a + area_b - inter
    return round(inter / union, 4) if union > 0 else 0.0


def compute_detection_precision_recall(
    pred_boxes: List[List[float]],
    gt_boxes: List[List[float]],
    iou_threshold: float = 0.5,
) -> Dict[str, float]:
    """Evaluate object detection Precision, Recall, and F1 at a given IoU threshold."""
    if not gt_boxes and not pred_boxes:
        return {"precision": 1.0, "recall": 1.0, "f1": 1.0, "tp": 0, "fp": 0, "fn": 0}
    if not gt_boxes:
        return {"precision": 0.0, "recall": 1.0, "f1": 0.0, "tp": 0, "fp": len(pred_boxes), "fn": 0}
    if not pred_boxes:
        return {"precision": 1.0, "recall": 0.0, "f1": 0.0, "tp": 0, "fp": 0, "fn": len(gt_boxes)}

    matched_gt = set()
    tp = 0
    for pbox in pred_boxes:
        best_iou = 0.0
        best_idx = -1
        for g_idx, gbox in enumerate(gt_boxes):
            if g_idx in matched_gt:
                continue
            iou = compute_bbox_iou(pbox, gbox)
            if iou > best_iou:
                best_iou = iou
                best_idx = g_idx
        if best_iou >= iou_threshold and best_idx >= 0:
            tp += 1
            matched_gt.add(best_idx)

    fp = len(pred_boxes) - tp
    fn = len(gt_boxes) - tp
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
    }


def compute_confusion_miou(confusion_counts: Dict[str, Tuple[int, int, int]]) -> Dict[str, float]:
    """
    Compute per-class IoU and Mean IoU from dict of {class_name: (intersection_px, pred_px, gt_px)}.
    """
    per_class: Dict[str, float] = {}
    for cls_name, (inter, pred_c, gt_c) in confusion_counts.items():
        union = pred_c + gt_c - inter
        per_class[cls_name] = round(inter / union, 4) if union > 0 else 0.0

    miou = round(sum(per_class.values()) / len(per_class), 4) if per_class else 0.0
    return {"mIoU": miou, **per_class}


def compute_geometry_metrics(
    pred_rooms_sqm: List[float],
    gt_rooms_sqm: List[float],
) -> Dict[str, float]:
    """Evaluate mean absolute area error (sqm) and relative error (%) for extracted rooms."""
    n = min(len(pred_rooms_sqm), len(gt_rooms_sqm))
    if n == 0:
        return {"room_count_match": 0.0, "mae_sqm": 0.0, "rel_error_pct": 0.0}

    abs_errors = [abs(pred_rooms_sqm[i] - gt_rooms_sqm[i]) for i in range(n)]
    rel_errors = [
        (abs(pred_rooms_sqm[i] - gt_rooms_sqm[i]) / max(gt_rooms_sqm[i], 0.1)) * 100.0
        for i in range(n)
    ]
    return {
        "evaluated_rooms": n,
        "mae_sqm": round(sum(abs_errors) / n, 3),
        "rel_error_pct": round(sum(rel_errors) / n, 2),
    }
