from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.schemas import RecommendResponseSchema, VendorProfileSchema
from app.services.data_service import fetch_rfps
from app.services.recommender import recommend_rfps

router = APIRouter()


@router.post("/recommend", response_model=RecommendResponseSchema)
def recommend(profile: VendorProfileSchema):
    try:
        rfps = fetch_rfps()
        results = recommend_rfps(rfps, profile, now=datetime.now())
        return {
            "count": len(results),
            "results": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))