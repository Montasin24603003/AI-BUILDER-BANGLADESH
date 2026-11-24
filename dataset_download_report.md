# PlanCheck AI — Dataset Download, Storage & Access Report

**Generated:** 2026-11-18  
**Workspace:** `C:\Users\LAPTOP\Downloads\AI-BUILDER-BANGLADESH`  
**Available Disk Space on `C:` Drive:** ~157.34 GB free (`168,947,601,408` bytes free / `86.99 GB` used)

---

## 1. Executive Summary of Download & Permission Checks

Per project guidelines (*"First complete dataset discovery, licensing review and download planning. Ask before downloading very large datasets. Report any authentication or access issues. Never bypass access restrictions."*), we inspected all target repositories, verified exact archive sizes and checksums, downloaded all lightweight official metadata, taxonomies, and sample vector SVGs directly into `data/raw/`, and documented what requires confirmation or credentials before bulk multi-gigabyte transfers.

| Dataset | Access Status | Size (Compressed) | What Was Downloaded Automatically | Action Needed From User |
| :--- | :--- | :--- | :--- | :--- |
| **1. CubiCasa5K** | Public (Zenodo Record `2613548` + GitHub) | **5.47 GB** (`5,469,495,706` bytes, MD5: `0ce0b203d1e3c125b51087b219bd23b9`) | `README.md`, `LICENSE`, `zenodo_record_2613548.json`, `house.py` (official 64-room / 51-icon taxonomy), `svg_loader.py`, `svg_utils.py`, `Difference_in_Room_Annotation.pdf` saved in `data/raw/cubicasa5k/` | **Confirm download of 5.47 GB `cubicasa5k.zip`** (note: raw zip + extracted files take ~15 GB; do **not** run legacy float32 `create_lmdb.py` which consumes ~105 GB). |
| **2. FloorPlanCAD** | Public Google Drive / HuggingFace Mirrors | **~2.9 GB** (3 split archives: Train 1, Train 2, Test) | `floorplancad_official_page.html`, `classes-page.html`, `catalogue.svg`, `table1.png`, and official vector samples `dataset00.svg`, `dataset01.svg`, `teaser01.svg` saved in `data/raw/floorplancad/` | **Confirm download** of full Train 1 / Train 2 / Test tar.xz archives (~2.9 GB total). |
| **3. Structured3D** | **Gated Agreement Required** | **~214 GB** | `README.md` and `LICENSE` from `bertjiazheng/Structured3D` saved in `data/raw/structured3d/` | 1. **Storage Alert**: Full 214 GB archive exceeds the 157.3 GB free space on `C:`.<br>2. **Agreement Form**: Fill out the official Academic/Non-Commercial Request Form at https://structured3d-dataset.org/ to receive authorized download links (or request only the 2D/annotation subset). |
| **4. Kaggle Floor Plan Datasets** | **Kaggle API Auth Required** | **0.18 GB – 0.35 GB** | Directory prepared at `data/raw/kaggle/` | Configure `~/.kaggle/kaggle.json` (see instructions below). |

---

## 2. How to Enable Automated Kaggle & Large Archive Downloads

### A. Configuring Kaggle API Credentials
Currently, `C:\Users\LAPTOP\.kaggle\kaggle.json` does **not** exist (`False`). To let our pipeline download Kaggle datasets automatically:
1. Sign in to [https://www.kaggle.com/settings](https://www.kaggle.com/settings).
2. Scroll to the **API** section and click **Create New Token** (downloads `kaggle.json`).
3. Place `kaggle.json` at:
   ```plaintext
   C:\Users\LAPTOP\.kaggle\kaggle.json
   ```
4. Once placed, our script (`preprocessing_pipeline/download_datasets.py`) can pull:
   - `dmitrysokolov/segmentation-of-floor-plans`
   - `ashishgup/floor-plan-dataset`

### B. Approving the 5.47 GB CubiCasa5K Zenodo Download
If you want to download the full 5.47 GB `cubicasa5k.zip` archive from Zenodo (`https://zenodo.org/api/records/2613548/files/cubicasa5k.zip/content`), reply **"Download CubiCasa5K full zip"** or run:
```powershell
Invoke-WebRequest -Uri "https://zenodo.org/api/records/2613548/files/cubicasa5k.zip/content" -OutFile "data/raw/cubicasa5k/cubicasa5k.zip"
```

### C. Structured3D Manual Agreement Steps
Because Structured3D requires an institutional/researcher agreement and prohibits automated scraping or redistribution:
1. Visit [https://structured3d-dataset.org/](https://structured3d-dataset.org/) and review the Terms of Use.
2. Submit the official request form.
3. Because the full dataset is **214 GB** and your `C:` drive has **157.3 GB** free, only download the **annotation JSON + 2D layout subset** or attach an external SSD.
