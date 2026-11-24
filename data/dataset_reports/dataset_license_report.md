# PlanCheck AI — Dataset Licensing, Provenance & Compliance Report

**Generated:** 2026-11-18  
**Purpose:** Ensure strict legal and copyright compliance across academic research vs. commercial SaaS deployment for PlanCheck AI.

---

## 1. Critical Legal Finding: Non-Commercial Restrictions (CC BY-NC 4.0)

> [!IMPORTANT]
> Almost all major academic floor-plan benchmarks (**CubiCasa5K**, **FloorPlanCAD**, **Structured3D**, **CVC-FP**) are released under **Non-Commercial (CC BY-NC 4.0 or Custom Academic)** licenses.
> - **Allowed:** Academic research, thesis work, non-commercial prototyping, benchmarking, and publishing evaluation metrics with proper citation.
> - **Restricted:** Training production model weights for a **commercial paid SaaS product** or redistributing the raw drawings without separate commercial licensing from the copyright holders.

---

## 2. Per-Dataset License Breakdown

### 1. CubiCasa5K (`DS-001`)
- **Official Source:** [https://github.com/CubiCasa/CubiCasa5k](https://github.com/CubiCasa/CubiCasa5k) / [Zenodo DOI 10.5281/zenodo.2613548](https://zenodo.org/record/2613548)
- **License:** **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**
- **Verified Text (`data/raw/cubicasa5k/LICENSE`):**
  > *"CubiCasa5K is licensed under a Creative Commons Attribution-NonCommercial 4.0 International License. Copyright (c) 2019."*
- **Permitted Use:** Non-commercial research, benchmarking wall/room segmentation and symbol detection, academic publication.
- **Commercial Restriction:** Commercial deployment requires written permission from CubiCasa Oy.
- **Required Citation:**
  > Kalervo, A., Ylioinas, J., Häikiö, M., Karhu, A., & Kannala, J. (2019). *CubiCasa5K: A Dataset and an Improved Multi-Task Model for Floorplan Image Analysis.* SCIA 2019.

### 2. FloorPlanCAD (`DS-002`)
- **Official Source:** [https://floorplancad.github.io/](https://floorplancad.github.io/)
- **License:** **CC BY-NC 4.0 (Annotations only)**; underlying CAD drawings remain copyright of respective architectural partners.
- **Verified Text (`data/raw/floorplancad/floorplancad_official_page.html`):**
  > *"The annotations in this dataset along with this website belong to us and are licensed under a Creative Commons Attribution-NonCommercial 4.0 License. We do not own the copyright of the drawings."*
- **Permitted Use:** Non-commercial research on panoptic symbol spotting and vector graphic recognition.
- **Required Citation:**
  > Fan, Z., Zhu, L., Li, H., Zhu, S., & Tan, P. (2021). *FloorPlanCAD: A Large-Scale CAD Drawing Dataset for Panoptic Symbol Spotting.* ICCV 2021.

### 3. Structured3D (`DS-003`)
- **Official Source:** [https://structured3d-dataset.org/](https://structured3d-dataset.org/) / [GitHub](https://github.com/bertjiazheng/Structured3D)
- **License:**
  - **Code & Scripts:** **MIT License** (`data/raw/structured3d/LICENSE`)
  - **Dataset Contents:** **Structured3D Terms of Use** (Non-commercial research & educational use only; no redistribution; requires signed user agreement).
- **Required Citation:**
  > Zheng, J., Zhang, J., Li, J., Tang, R., Gao, S., & Zhou, Z. (2020). *Structured3D: A Large Photo-realistic Dataset for Structured 3D Modeling.* ECCV 2020.

### 4. Kaggle Floor Plan Datasets (`DS-004`, `DS-005`)
- **CVC-FP Derivative (`ashishgup/floor-plan-dataset`):** Originated from Computer Vision Center (UAB, Spain) CVC-FP dataset; restricted to non-commercial academic research.
- **Floor Plan Segmentation (`dmitrysokolov/segmentation-of-floor-plans`):** Verify individual image provenance before any commercial use; treat as research/benchmarking only.

---

## 3. Strategy for Commercial-Safe Bangladesh Dataset (`DS-006`)

To ensure PlanCheck AI can be legally commercialized in Bangladesh without violating CC BY-NC terms:
1. **Use Public Datasets Strictly for Pipeline Benchmarking & Research:** Validate our OpenCV preprocessing, SVG-to-mask conversion, and evaluation metrics on CubiCasa5K / FloorPlanCAD under non-commercial research scope.
2. **Build Permissioned Bangladeshi Floor-Plan Corpus (`data/raw/bangladesh_drawings/`):**
   - Collect CAD (`.dxf`/`.dwg`/`.pdf`/`.png`) sheets only with **signed Data Contribution & Commercial Training Consent** from partnering Bangladeshi architects (IAB members), structural firms (IEB members), and landowners.
   - Strip all personal PII (Owner Name, NID, Phone, exact Plot/Dag/Khatian numbers, signature stamps) prior to storage in `data/processed/`.
   - Generate synthetic parametric Bangladesh floor plans (using our deterministic generator) which carry **100% first-party commercial ownership**.
