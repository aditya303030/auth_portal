from fastapi import APIRouter, HTTPException, Query

from app.services.user_service import get_user_data, upsert_user_data
from app.schemas import UserInfoSchema

router = APIRouter()

@router.get('/me')
def get_me(uuid: str = Query(..., description='Supabase user UUID')):
    print(f"Getting user data for uuid: {uuid}")
    try:
        user_data = get_user_data(uuid)
        if user_data is None:
            raise HTTPException(status_code=404, detail='Profile not found')
        return {'uuid': uuid, 'user_information': user_data}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting user data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/users')
def create_or_update_user(payload: UserInfoSchema):
    print(f"Upserting user data for uuid: {payload.uuid}")
    try:
        user_info = {
            'company_name': payload.company_name,
            'naics_codes': payload.naics_codes,
            'cage': payload.cage,
            'tags': payload.tags,
            'location': payload.location,
            'core_competencies': payload.core_competencies,
            'website': payload.website,
            'hq_location': payload.hq_location,
            'service_areas': payload.service_areas,
            'years_in_business': payload.years_in_business,
            'uei': payload.uei,
            'company_description': payload.company_description,
            'differentiators': payload.differentiators,
            'past_performance': payload.past_performance,
            'portfolio_pdf_text': payload.portfolio_pdf_text,
            'contact_name': payload.contact_name,
            'contact_email': payload.contact_email,
            'contact_phone': payload.contact_phone,
        }

        upserted = upsert_user_data(payload.uuid, user_info)
        print(f"Upsert successful for uuid: {payload.uuid}")
        return {
            'status': 'ok',
            'data': upserted,
            'warnings': [
                f"Skipped unsupported columns in user_information: {', '.join(upserted['_dropped_columns'])}"
            ] if upserted.get('_dropped_columns') else [],
        }
    except Exception as e:
        print(f"Error upserting user data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
