from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import json

from app.schemas import ChatRequestSchema, ChatResponseSchema
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
async def chat_with_upload(
    profile: str = Form(...),
    rfp: str = Form(...),
    chat_history: str = Form("[]"),
    portfolio_text: str = Form(""),
    message: str = Form(""),
    file: UploadFile | None = File(None),
):
    try:
        profile_obj = ChatRequestSchema.model_fields["profile"].annotation.model_validate_json(profile)
        rfp_obj = ChatRequestSchema.model_fields["rfp"].annotation.model_validate_json(rfp)
        history_list = json.loads(chat_history)

        rfp_pdf_text = ""
        if file:
            content = await file.read()
            if file.filename and file.filename.lower().endswith(".pdf"):
                rfp_pdf_text = pdf_bytes_to_text(content)
            else:
                try:
                    rfp_pdf_text = content.decode("utf-8", errors="ignore")
                except Exception:
                    rfp_pdf_text = ""

        user_message = message.strip() or (
            "I uploaded a document. Please analyze it and summarize the key requirements, "
            "eligibility criteria, deadlines, and whether it is a good fit for my company."
        )

        history_list.append({"role": "user", "content": user_message})

        reply = generate_reply(
            profile=profile_obj,
            rfp=rfp_obj,
            rfp_pdf_text=rfp_pdf_text,
            portfolio_text=profile_obj.portfolio_pdf_text or portfolio_text,
            chat_history=history_list,
        )

        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))