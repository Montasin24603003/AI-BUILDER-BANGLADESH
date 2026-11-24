# Bangladesh-Specific Architectural Data Collection & Governance Protocol

## 1. Purpose & Separation of Concerns

International datasets (**CubiCasa5K** from Finland/Europe, **FloorPlanCAD** from China, **Structured3D**) differ significantly from Bangladeshi residential and commercial drawings in:
1. **Spatial Typologies:** Bangladeshi apartments typically include separate formal *Drawing* (guest living) and *Dining* zones, kitchen utility verandas (*Service Balcony*), prayer/puja alcoves, domestic staff quarters/toilets, and dog-legged staircases around a central lift core.
2. **Drafting & Dimension Conventions:** Local RAJUK/CDA/KDA submission sheets mix Feet-Inches (`12'-6" x 14'-0"`), Katha/Decimal plot tables, and Bangla/English room annotations (`ড্রইং`, `ডাইনিং`, `বারান্দা`).
3. **Structural Elements:** Reinforced Concrete (RCC) column grids (`C1, C2...`) and tie-beams are prominently drawn directly inside architectural floor plans in Bangladesh, whereas European datasets (e.g., CubiCasa5K) rarely annotate RCC columns.

> [!IMPORTANT]
> **Strict Architectural Rule:** Visual ML training data (`data/raw/bangladesh_drawings/` and `data/processed/`) is kept **100% separate** from the **PlanCheck Regulatory Intelligence Engine (PRIE)** (`src/data/bangladeshRules.ts` and `backend/app/services/regulatory_engine.py`). Vision models **only** perceive geometry, rooms, symbols, and text; legal compliance (FAR, MGC, Setbacks, BNBC 2020) is always evaluated deterministically by PRIE.

---

## 2. Permissioned Intake & Anonymization Workflow

1. **Written Consent & Provenance:**
   - Only ingest CAD (`.dxf`/`.dwg`), PDF, or raster drawings accompanied by a signed contributor release from the owning IAB-registered Architect, IEB-registered Engineer, or property owner.
2. **Mandatory Title-Block Anonymization:**
   - Crop or redact landowner names, NID numbers, phone numbers, exact Dag/Khatian/Plot numbers, and professional seal/signature blocks before moving files from `data/raw/bangladesh_drawings/` to `data/processed/`.
3. **Annotation Checklist for Bangladeshi Sheets:**
   - Annotate all 11 unified classes (`wall`, `door`, `window`, `room`, `staircase`, `column`, `bathroom`, `kitchen`, `bedroom`, `living_room`, `corridor`), paying special attention to **`column`** (RCC pillars) and **`staircase`** clear flight width.
