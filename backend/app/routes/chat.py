from fastapi import APIRouter, HTTPException

from app.schemas import ChatRequestSchema, ChatResponseSchema
from app.services.llm_service import generate_reply

router = APIRouter()


@router.post("/chat", response_model=ChatResponseSchema)
def chat(request: ChatRequestSchema):
    try:
        chat_history = [msg.model_dump() for msg in request.chat_history]

        reply = generate_reply(
            profile=request.profile,
            rfp=request.rfp,
            rfp_pdf_text=request.rfp_pdf_text,
            portfolio_text=request.profile.portfolio_pdf_text or request.portfolio_text,
            chat_history=chat_history,
        )

        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))