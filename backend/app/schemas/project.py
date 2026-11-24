from typing import List, Optional
from pydantic import BaseModel, Field


class SelectPageRequest(BaseModel):
    page: int = Field(ge=1)


class ScaleCalibrationRequest(BaseModel):
    reference_width_m: float = Field(gt=1.0, le=100.0)


class SampleProjectRequest(BaseModel):
    template: str = "2br-apartment"
    project_name: Optional[str] = None
    building_type: Optional[str] = None


class BatchCorrectionRequest(BaseModel):
    issue_ids: Optional[List[str]] = None
    mode: str = "apply_accepted"
