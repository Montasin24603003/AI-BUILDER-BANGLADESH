# PlanCheck AI Bangladesh

React, TypeScript, Tailwind CSS, Three.js, and FastAPI tools for architectural drawing review and preliminary Bangladesh plot / engineering workflows.

## Run in VS Code

Open this project folder in VS Code. In its integrated PowerShell terminal, run:

```powershell
npm install
npm run dev
```

Open the local URL Vite prints, usually `http://localhost:5173`.

## Google Maps plot picker

The Plot Analysis page includes a click-to-place Google Maps pin. To enable it:

1. Create a Google Maps Platform project, enable Maps JavaScript API, and create an API key.
2. Restrict the key to Maps JavaScript API and your website referrers. For local development, allow `http://localhost:5173/*`.
3. Copy `.env.example` to `.env.local`, add your key after `VITE_GOOGLE_MAPS_API_KEY=`, and restart the Vite server.

A standard Google Maps key requires a billing-enabled project. The frontend key is visible to browsers, so restrict it by API and referrer. The pin records latitude/longitude; it does not verify a plot boundary, authority jurisdiction, DAP block, land use, or permit. See [Google's Maps JavaScript API setup](https://developers.google.com/maps/documentation/javascript/get-api-key).

## Optional FastAPI backend

Install the dependencies from `backend/requirements.txt`, then run:

```powershell
cd .\backend
python -m uvicorn app.main:app --reload --port 8000
```

The frontend can run without the backend. Set `GEMINI_API_KEY` only if you want optional AI-written explanations.

## Regulatory and engineering limits

The law catalog links to official sources, including the Dhaka Metropolitan Building Rules, 2025 (S.R.O. No. 469-Law/2025) and BNBC 2020 (S.R.O. No. 55-Law/2020). Plot-specific FAR, ground coverage, setbacks, parking, and storey allowances are withheld until the controlling official schedule and site zoning are verified. District-level lookup and a Google Maps pin do not establish those facts.

Structural quantities, member sizing, foundation choice, and MEP loads are not calculated. The engineering page is now an input checklist and schematic aid for a qualified local design team, not an engineering design or construction document. The floor-plan upload workflow still includes simulated geometry and demonstration checks; it is not a validated drawing-recognition or code-compliance system.

---

## ML Dataset & Computer Vision Preparation Pipeline

This repository includes a modular dataset inspection, annotation normalization, and preprocessing pipeline for training and evaluating floor-plan recognition models.

### 1. Dataset Directory Layout

```plaintext
data/
├── raw/
│   ├── cubicasa5k/          # Official CubiCasa5K taxonomy (house.py), SVG loaders, Zenodo metadata
│   ├── floorplancad/        # Official FloorPlanCAD sample SVGs (dataset00.svg, dataset01.svg, teaser01.svg)
│   ├── structured3d/        # Official Structured3D README & MIT code license
│   ├── kaggle/              # Target directory for Kaggle floor-plan segmentation archives
│   └── bangladesh_drawings/ # Permission-based Bangladeshi architectural CAD/plan intake
├── processed/
│   ├── images/              # Deskewed & normalized 1024x1024 floor-plan images
│   ├── masks/               # 12-class semantic segmentation masks
│   ├── annotations/         # Unified JSON annotations (11 target object classes)
│   ├── vectors/             # Parsed SVG CAD primitive statistics
│   └── geometry/            # Structured FloorPlanGeometry JSON outputs
├── train/                   # Stratified training split manifest
├── validation/              # Stratified validation split manifest
├── test/                    # Stratified test split manifest
└── dataset_reports/         # Copies of registry, download, and license reports
```

### 2. Key ML Deliverables

- **[dataset_registry.csv](file:///C:/Users/LAPTOP/Downloads/AI-BUILDER-BANGLADESH/dataset_registry.csv)**: Master index of datasets, sample counts, sizes, licenses, and tasks.
- **[dataset_download_report.md](file:///C:/Users/LAPTOP/Downloads/AI-BUILDER-BANGLADESH/dataset_download_report.md)**: Exact sizes, checksums, Kaggle API setup (`~/.kaggle/kaggle.json`), and Structured3D agreement steps.
- **[dataset_license_report.md](file:///C:/Users/LAPTOP/Downloads/AI-BUILDER-BANGLADESH/dataset_license_report.md)**: Non-commercial (`CC BY-NC 4.0`) compliance audit and commercial-safe Bangladesh data collection rules.
- **[annotation_mapping.yaml](file:///C:/Users/LAPTOP/Downloads/AI-BUILDER-BANGLADESH/annotation_mapping.yaml)**: Exact mapping from CubiCasa5K, FloorPlanCAD, and Structured3D into the 11 unified classes (`wall`, `door`, `window`, `room`, `staircase`, `column`, `bathroom`, `kitchen`, `bedroom`, `living_room`, `corridor`) without inventing missing labels.
- **[dataset_inspection.ipynb](file:///C:/Users/LAPTOP/Downloads/AI-BUILDER-BANGLADESH/dataset_inspection.ipynb)**: Interactive Jupyter Notebook inspecting class mappings, SVG primitives, OCR parsing, and evaluation metrics.
- **[preprocessing_pipeline/](file:///C:/Users/LAPTOP/Downloads/AI-BUILDER-BANGLADESH/preprocessing_pipeline)**:
  - `preprocess_opencv.py` (Module A: OpenCV deskewing, denoising, letterbox resize, adaptive thresholding)
  - `object_detection.py` (Module B: Door, window, staircase, and column bounding-box extraction)
  - `semantic_segmentation.py` (Module C: Multi-class wall & room segmentation mapper)
  - `ocr_extractor.py` (Module D: Imperial `ft-in`, metric `cm/m`, and Bangla/English room label parser)
  - `geometry_extractor.py` (Module E: Structured `FloorPlanGeometry` JSON exporter)
  - `evaluate_metrics.py` (Module F: Precision, Recall, F1, mIoU, and room area MAE evaluator)
  - `bangladesh_data_protocol.md` (Section 7: Permissioned Bangladeshi architectural drawing governance)
- **[train_validation_test_split/](file:///C:/Users/LAPTOP/Downloads/AI-BUILDER-BANGLADESH/train_validation_test_split)**: `train.csv`, `validation.csv`, `test.csv`, and `split_summary.json`.
- **[sample_visualizations/](file:///C:/Users/LAPTOP/Downloads/AI-BUILDER-BANGLADESH/sample_visualizations)**: Visual annotation overlays (`sample_01_unified_annotation_overlay.svg`, `sample_02_floorplancad_raw_vector.svg`, `inspection_dashboard.html`).

### 3. Running Dataset Verification & Inspection

To regenerate processed vector stats, unified annotations, train/val/test split manifests, and SVG visualizations:

```powershell
node .\preprocessing_pipeline\verify_and_generate.mjs
```

To verify the frontend and TypeScript build remain clean:

```powershell
npm run build
```
