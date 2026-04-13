import os
import re
from supabase import create_client

SUPA_URL = os.environ.get('SUPA_URL')
SUPA_KEY = os.environ.get('SUPA_KEY')


def get_supabase_client():
    if not SUPA_URL or not SUPA_KEY:
        raise RuntimeError('Missing SUPA_URL or SUPA_KEY in environment')
    print("Creating Supabase client")
    return create_client(SUPA_URL, SUPA_KEY)


MISSING_COLUMN_RE = re.compile(r"Could not find the '([^']+)' column")


def _normalize_user_row(row: dict):
    row = dict(row or {})
    row['naics_codes'] = [c.strip() for c in (row.get('naics_codes') or '').split(',') if c.strip()]
    row['core_competencies'] = [c.strip() for c in (row.get('core_competencies') or '').split(',') if c.strip()]
    row['tags'] = row.get('tags') or []
    row['uei'] = row.get('uei', '')
    row['past_performance'] = row.get('past_performance', [])
    row['portfolio_pdf_text'] = row.get('portfolio_pdf_text', '')
    row['contact_name'] = row.get('contact_name', '')
    row['contact_email'] = row.get('contact_email', '')
    row['contact_phone'] = row.get('contact_phone', '')
    row['service_areas'] = row.get('service_areas', '')
    return row


def _extract_missing_column(error: Exception):
    message = str(error)
    match = MISSING_COLUMN_RE.search(message)
    if match:
        return match.group(1)
    return None


def get_user_data(uuid: str):
    client = get_supabase_client()
    print(f"Querying user_information for uuid: {uuid}")
    try:
        response = client.table('user_information').select('*').eq('uuid', uuid).single().execute()
    except Exception as exc:
        message = str(exc)
        if 'PGRST116' in message or '0 rows' in message.lower():
            print(f"No data found for uuid: {uuid}")
            return None
        raise RuntimeError(f"Supabase user query failed: {exc}") from exc

    if getattr(response, 'data', None) is None:
        print(f"No data found for uuid: {uuid}")
        return None

    row = _normalize_user_row(response.data)

    print(f"User data retrieved: {row}")
    return row


def upsert_user_data(uuid: str, user_information: dict):
    client = get_supabase_client()
    payload = {
        'uuid': uuid,
        'company_name': user_information.get('company_name', ''),
        'naics_codes': ', '.join(user_information.get('naics_codes', [])),
        'cage': user_information.get('cage', ''),
        'tags': user_information.get('tags', []),
        'location': user_information.get('location', ''),
        'core_competencies': ', '.join(user_information.get('core_competencies', [])),
        'website': user_information.get('website', ''),
        'hq_location': user_information.get('hq_location', ''),
        'service_areas': user_information.get('service_areas', ''),
        'years_in_business': user_information.get('years_in_business', 0),
        'uei': user_information.get('uei', ''),
        'company_description': user_information.get('company_description', ''),
        'differentiators': user_information.get('differentiators', ''),
        'contact_name': user_information.get('contact_name', ''),
        'contact_email': user_information.get('contact_email', ''),
        'contact_phone': user_information.get('contact_phone', ''),
    }
    dropped_columns = []

    while True:
        print(f"Upserting payload: {payload}")
        try:
            response = client.table('user_information').upsert(payload, on_conflict='uuid').execute()
        except Exception as exc:
            missing_column = _extract_missing_column(exc)
            if missing_column and missing_column in payload and missing_column != 'uuid':
                print(f"Skipping unsupported user_information column: {missing_column}")
                dropped_columns.append(missing_column)
                payload.pop(missing_column, None)
                continue
            raise RuntimeError(f"Supabase upsert failed: {exc}") from exc
        break

    response_data = getattr(response, 'data', None)
    print(f"Upsert successful: {response_data}")
    upserted_row = response_data[0] if isinstance(response_data, list) and response_data else response_data
    normalized = _normalize_user_row(upserted_row or payload)
    if dropped_columns:
        normalized['_dropped_columns'] = dropped_columns
    return normalized
