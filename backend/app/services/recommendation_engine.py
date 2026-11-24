import os
from typing import List
from app.models.issue import PlanIssueModel


def enrich_recommendations_with_ai(issues: List[PlanIssueModel]) -> List[PlanIssueModel]:
    """
    Optionally enhances natural-language architectural explanations via Gemini API
    if GEMINI_API_KEY is configured in the environment.
    IMPORTANT:
    - Never lets an LLM invent or alter numerical measurements.
    - Gracefully falls back to deterministic explanations if GEMINI_API_KEY is absent or fails.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key or not issues:
        return issues

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        for issue in issues:
            prompt = (
                "You are an architectural review assistant. In 1 concise sentence (max 28 words), "
                "explain why an architect should review this item without inventing any new numbers or claiming code certification.\n"
                f"Issue: {issue.title}. Detected: {issue.detected_value}. Target: {issue.expected_value}."
            )
            resp = model.generate_content(prompt)
            text = (getattr(resp, "text", "") or "").strip()
            if text and len(text) < 260:
                issue.why_it_matters = text
    except Exception:
        # Graceful deterministic fallback — never crash analysis if LLM API is unavailable
        pass

    return issues
