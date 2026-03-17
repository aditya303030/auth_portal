import os
from supabase import create_client


SUPA_URL = os.environ.get("SUPA_URL")
SUPA_KEY = os.environ.get("SUPA_KEY")
TABLE_NAME = os.environ.get("SUPA_TABLE", "EVA_RFP_META")


def get_supabase_client():
    if not SUPA_URL or not SUPA_KEY:
        raise ValueError("Missing SUPA_URL or SUPA_KEY environment variables.")
    return create_client(SUPA_URL, SUPA_KEY)


def normalize_eva_rows(rows):
    out = []
    for r in rows:
        out.append(
            {
                "id": str(r.get("externalid") or r.get("id") or ""),
                "title": r.get("shortdesc") or "",
                "status": r.get("status") or "",
                "close_dt": r.get("closedate"),
                "location": r.get("workloc") or "",
                "tags": [r.get("category")] if r.get("category") else [],
                "description": r.get("longdesc") or r.get("description") or "",
                "link": r.get("link") or "",
                "raw": r,
            }
        )
    return out


def fetch_rfps(limit=2000):
    client = get_supabase_client()
    response = client.table(TABLE_NAME).select("*").limit(limit).execute()
    rows = response.data or []
    return normalize_eva_rows(rows)