import io
import os
from huggingface_hub import InferenceClient

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None


HF_TOKEN = os.environ.get("LLM_KEY")
MODEL = "meta-llama/Meta-Llama-3-8B-Instruct"

client = None
if HF_TOKEN:
    client = InferenceClient(model=MODEL, token=HF_TOKEN)


def pdf_bytes_to_text(pdf_bytes: bytes) -> str:
    if not pdf_bytes:
        return ""
    if PdfReader is None:
        return ""

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        parts = []
        for page in reader.pages:
            txt = page.extract_text() or ""
            if txt.strip():
                parts.append(txt)
        return "\n\n".join(parts).strip()
    except Exception:
        return ""


def profile_context(profile) -> str:
    def g(name, default=""):
        return getattr(profile, name, default)

    certifications = g("certifications", []) or []
    naics_codes = g("naics_codes", []) or []
    core = g("core_competencies", []) or []
    diffs = g("differentiators", []) or []
    past = g("past_performance", []) or []

    portfolio_name = g("portfolio_pdf_name", "")
    has_portfolio = bool(g("portfolio_pdf_text", ""))

    lines = []
    lines.append("VENDOR INTAKE (Structured)")
    lines.append(f"- Legal name: {g('legal_name')}")
    lines.append(f"- Website: {g('website')}")
    lines.append(f"- Contact: {g('contact_name')} | {g('contact_email')} | {g('contact_phone')}")
    lines.append(f"- HQ: {g('hq_location')}")
    lines.append(f"- Service areas: {g('service_areas')}")
    lines.append(f"- Years in business: {g('years_in_business')}")
    lines.append(f"- UEI: {g('uei')} | CAGE: {g('cage')}")
    lines.append(f"- NAICS: {', '.join(naics_codes) if naics_codes else ''}")
    lines.append(f"- Certifications: {', '.join(certifications) if certifications else ''}")
    lines.append("")
    lines.append("CAPABILITIES (Bullets)")
    if core:
        lines.append("- Core competencies: " + "; ".join(core))
    if diffs:
        lines.append("- Differentiators: " + "; ".join(diffs))
    lines.append("")
    lines.append("PAST PERFORMANCE (if provided)")
    if past:
        for i, p in enumerate(past[:3], start=1):
            lines.append(
                f"- {i}) {getattr(p, 'client', '')}: {getattr(p, 'project_title', '')} ({getattr(p, 'completion_year', '')}) — {getattr(p, 'scope', '')}"
            )
    lines.append("")
    lines.append("RANKING INPUTS (for reference)")
    lines.append(f"- Company description: {g('company_description')}")
    lines.append(f"- Selected tags: {g('selected_tags')}")
    lines.append(f"- Location keywords: {g('location_keywords')}")
    lines.append("")
    lines.append("UPLOADED PORTFOLIO")
    if has_portfolio:
        lines.append(f"- Portfolio text provided: {portfolio_name or 'yes'}")
    else:
        lines.append("- Portfolio text: not provided")

    return "\n".join(lines).strip()


def rfp_context(rfp) -> str:
    return f"""
SELECTED OPPORTUNITY (Database Fields)
- ID: {getattr(rfp, 'id', '')}
- Title: {getattr(rfp, 'title', '')}
- Status: {getattr(rfp, 'status', '')}
- Close date: {getattr(rfp, 'close_dt', '')}
- Location: {getattr(rfp, 'location', '')}
- Description: {getattr(rfp, 'description', '')}

RFP LINK (if available):
{getattr(rfp, 'link', '')}
""".strip()


def system_prompt(profile, rfp, rfp_pdf_text: str, portfolio_text: str) -> str:
    ctx_profile = profile_context(profile)
    ctx_rfp = rfp_context(rfp)

    rfp_pdf_block = ""
    if (rfp_pdf_text or "").strip():
        rfp_pdf_block = f"\n\nRFP PDF TEXT\n{rfp_pdf_text[:12000]}\n\n(End of PDF excerpt)"

    portfolio_block = ""
    if (portfolio_text or "").strip():
        portfolio_block = f"\n\nVENDOR PORTFOLIO TEXT\n{portfolio_text[:12000]}\n\n(End of portfolio excerpt)"

    return f"""
You are an expert government contracting proposal strategist.

Rules:
- You help answer questions about compliance, scope, risks, bid/no-bid, win themes, and what documents to prepare.
- You do not generate a full capability statement unless the user explicitly asks.
- When asked to draft, use the vendor intake details and any uploaded portfolio/RFP text.
- If the user asks something that requires the RFP PDF and it is not provided, tell them to upload it.
- Do not invent RFP requirements.
- If the RFP text is missing, clearly say what you cannot confirm.

Context follows.

{ctx_profile}

{ctx_rfp}
{rfp_pdf_block}
{portfolio_block}
""".strip()


def generate_reply(profile, rfp, rfp_pdf_text: str, portfolio_text: str, chat_history):
    if not client:
        return "LLM not configured. Please set the environment variable `LLM_key`."

    sys = system_prompt(profile, rfp, rfp_pdf_text, portfolio_text)

    messages = [{"role": "system", "content": sys}]
    messages.extend(chat_history)

    response = client.chat_completion(
        messages=messages,
        max_tokens=900,
        temperature=0.7,
    )
    return response.choices[0].message.content