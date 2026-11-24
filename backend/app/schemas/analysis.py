from typing import Optional
from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    reference_width_m: Optional[float] = None
    stair_target_cm: int = 100
    min_door_clearance_cm: int = 90
