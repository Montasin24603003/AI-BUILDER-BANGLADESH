from pathlib import Path
from typing import List
import pymupdf as fitz


def render_pdf_pages(pdf_path: Path, output_dir: Path, project_id: str, max_pages: int = 8) -> List[str]:
    """
    Converts PDF pages into PNG images using PyMuPDF so multi-page architectural PDFs
    can be previewed, page-selected, and passed into OpenCV image processing.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(str(pdf_path))
    preview_urls: List[str] = []
    try:
        total = min(len(doc), max_pages)
        for idx in range(total):
            page = doc.load_page(idx)
            # Render at ~150 DPI for crisp architectural line detection without huge files
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), alpha=False)
            out_file = output_dir / f"page_{idx + 1}.png"
            pix.save(str(out_file))
            preview_urls.append(f"/storage/{project_id}/page_{idx + 1}.png")
    finally:
        doc.close()
    return preview_urls


def get_pdf_page_count(pdf_path: Path) -> int:
    doc = fitz.open(str(pdf_path))
    try:
        return len(doc)
    finally:
        doc.close()
