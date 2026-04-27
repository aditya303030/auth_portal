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
        filename = (file.filename or "").lower()
        if filename.endswith(".pdf"):
            rfp_pdf_text = pdf_bytes_to_text(file_bytes)
        else:
            rfp_pdf_text = file_bytes.decode("utf-8", errors="ignore").strip()

        if not rfp_pdf_text.strip():
            return {
                "reply": (
                    "I couldn't extract readable text from that upload. If this is a scanned "
                    "PDF or image-only document, please upload a text-based PDF or paste the "
                    "relevant text."
                ),
                "rfp_pdf_text": "",
            }

        user_message = message.strip() or (
            "I uploaded a document. Please analyze it and summarize the key requirements, "
            "eligibility criteria, deadlines, risks, and whether it is a good fit for my company."
        )
        parsed_history.append(ChatMessageSchema(role="user", content=user_message))

        reply = generate_reply(
            profile=parsed_profile,
            rfp=parsed_rfp,
            rfp_pdf_text=rfp_pdf_text,
            portfolio_text=parsed_profile.portfolio_pdf_text or portfolio_text,
            chat_history=[
                msg.model_dump() if hasattr(msg, "model_dump") else msg for msg in parsed_history
            ],
        )

        return {"reply": reply, "rfp_pdf_text": rfp_pdf_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
