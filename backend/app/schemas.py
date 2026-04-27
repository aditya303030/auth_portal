from typing import Any, Dict, List
from pydantic import BaseModel


class PastPerformanceItem(BaseModel):
    client: str = ""
    project_title: str = ""
    scope: str = ""
    completion_year: int = 0
    contract_value: str = ""


class VendorProfileSchema(BaseModel):
    max_age_days: int
    company_description: str
    selected_tags: List[str] = []
    location_keywords: str = ""
    open_only: bool = True
    top_k: int = 25

    legal_name: str = ""
    website: str = ""
    contact_name: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    hq_location: str = ""
    service_areas: str = ""

    uei: str = ""
    cage: str = ""
    years_in_business: int = 0
    naics_codes: List[str] = []
    certifications: List[str] = []

    core_competencies: List[str] = []
    differentiators: List[str] = []

    past_performance: List[PastPerformanceItem] = []

    portfolio_pdf_name: str = ""
    portfolio_pdf_text: str = ""


class RFPItemSchema(BaseModel):
    id: str = ""
    title: str = ""
    status: str = ""
    close_dt: str = ""
    location: str = ""
    tags: List[str] = []
    description: str = ""
    link: str = ""


class ChatMessageSchema(BaseModel):
    role: str
    content: str


class ChatRequestSchema(BaseModel):
    profile: VendorProfileSchema
    rfp: RFPItemSchema
    chat_history: List[ChatMessageSchema] = []
    rfp_pdf_text: str = ""
    portfolio_text: str = ""


class ChatResponseSchema(BaseModel):
    reply: str
    rfp_pdf_text: str = ""


class RecommendResponseSchema(BaseModel):
    count: int
    results: List[Dict[str, Any]]


class UserInfoSchema(BaseModel):
    uuid: str
    company_name: str = ''
    naics_codes: List[str] = []
    cage: str = ''
    tags: List[str] = []
    location: str = ''
    core_competencies: List[str] = []
    website: str = ''
    hq_location: str = ''
    service_areas: str = ''
    years_in_business: int = 0
    uei: str = ''
    company_description: str = ''
    differentiators: str = ''
    past_performance: List[PastPerformanceItem] = []
    portfolio_pdf_text: str = ''
    contact_name: str = ''
    contact_email: str = ''
    contact_phone: str = ''
