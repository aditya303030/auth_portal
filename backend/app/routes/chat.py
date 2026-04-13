import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas import (
    ChatMessageSchema,
    ChatRequestSchema,
    ChatResponseSchema,
    RFPItemSchema,
    VendorProfileSchema,
)
from app.services.llm_service import generate_reply, pdf_bytes_to_text

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


@router.post("/chat/upload", response_model=ChatResponseSchema)
async def chat_upload(
    profile: str = Form(...),
    rfp: str = Form(...),
    chat_history: str = Form("[]"),
    portfolio_text: str = Form(""),
    message: str = Form(""),
    file: UploadFile = File(...),
):
    try:
        parsed_profile = VendorProfileSchema.model_validate(json.loads(profile))
        parsed_rfp = RFPItemSchema.model_validate(json.loads(rfp))
        parsed_history = [
            ChatMessageSchema.model_validate(item)
            for item in json.loads(chat_history)
        ]
        file_bytes = await file.read()
        rfp_pdf_text = pdf_bytes_to_text(file_bytes)

        if message.strip():
            parsed_history.append(ChatMessageSchema(role="user", content=message.strip()))

        reply = generate_reply(
            profile=parsed_profile,
            rfp=parsed_rfp,
            rfp_pdf_text=rfp_pdf_text,
            portfolio_text=parsed_profile.portfolio_pdf_text or portfolio_text,
            chat_history=[
                msg.model_dump() if hasattr(msg, "model_dump") else msg for msg in parsed_history
            ],
        )

        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
