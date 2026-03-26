from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union
import re

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


RFPish = Union[Dict[str, Any], Any]


def _get(r, k, default=""):
    return r.get(k, default) if isinstance(r, dict) else getattr(r, k, default)


def _get_dt(r):
    dt = _get(r, "close_dt", None)

    if isinstance(r, dict):
        dt = r.get("closedate") or r.get("close_dt")

    if isinstance(dt, str) and dt:
        try:
            return datetime.fromisoformat(dt.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            return None

    return dt


def _close_date_str(dt):
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d %I:%M %p")


def _days_until(dt: Optional[datetime], now: datetime) -> Optional[float]:
    if dt is None:
        return None
    return (dt - now).total_seconds() / 86400.0


def _recency_score(days_until_close: Optional[float], max_age_days: int) -> float:
    if days_until_close is None:
        return 0.05
    if days_until_close < 0:
        return 0.0
    if days_until_close > max_age_days:
        return 0.0
    return max(0.0, min(1.0, 1.0 - (days_until_close / max_age_days)))


def _tag_score(rfp_tags: List[str], selected_tags: List[str]) -> float:
    if not selected_tags:
        return 0.0
    if not rfp_tags:
        return 0.0

    rset = set(t.lower() for t in rfp_tags)
    sset = set(t.lower() for t in selected_tags)
    overlap = len(rset.intersection(sset))
    return overlap / max(1, len(sset))


def _location_score(location: str, location_keywords: str) -> float:
    kw = location_keywords.strip().lower()
    if not kw:
        return 0.0

    loc = (location or "").lower()
    tokens = [t for t in re.split(r"[,\s]+", kw) if t]
    if not tokens:
        return 0.0

    hits = sum(1 for t in tokens if t in loc)
    return hits / len(tokens)


def _past_performance_text(past_performance) -> str:
    """Extract text from past performance items for TF-IDF matching."""
    if not past_performance:
        return ""
    
    parts = []
    for item in past_performance:
        # Handle both dict and object attribute access
        client = item.get("client") if isinstance(item, dict) else getattr(item, "client", "")
        title = item.get("project_title") if isinstance(item, dict) else getattr(item, "project_title", "")
        scope = item.get("scope") if isinstance(item, dict) else getattr(item, "scope", "")
        
        if client or title or scope:
            parts.append(f"{client} {title} {scope}".strip())
    
    return " ".join(parts).strip()


def recommend_rfps(
    rfps: List[RFPish],
    profile,
    *,
    now: Optional[datetime] = None,
    weights: Tuple[float, float, float, float, float] = (0.50, 0.20, 0.15, 0.10, 0.05),
) -> List[Dict[str, Any]]:
    if now is None:
        now = datetime.now()
    elif now.tzinfo is not None:
        now = now.replace(tzinfo=None)

    filtered: List[RFPish] = []

    for r in rfps:
        status = r.get("status") if isinstance(r, dict) else getattr(r, "status", None)

        if profile.open_only and (not status or status.lower() != "open"):
            continue

        close_dt = _get_dt(r)
        d = _days_until(close_dt, now)

        if d is not None:
            if d < 0:
                continue
            if d > profile.max_age_days:
                continue

        filtered.append(r)

    if not filtered:
        return []

    corpus = []
    for r in filtered:
        title = _get(r, "title", "") if not isinstance(r, dict) else (r.get("shortdesc") or r.get("title") or "")
        desc = _get(r, "description", "") if not isinstance(r, dict) else (r.get("longdesc") or r.get("description") or "")
        loc = _get(r, "location", "") if not isinstance(r, dict) else (r.get("workloc") or r.get("location") or "")
        tags = _get(r, "tags", []) if not isinstance(r, dict) else (r.get("tags") or ([r.get("category")] if r.get("category") else []))

        corpus.append(" ".join([str(title), str(desc), str(loc), " ".join([t for t in tags if t])]).strip())

    # Build query from company description + past performance
    query_parts = []
    
    company_desc = (profile.company_description or "").strip()
    if company_desc:
        query_parts.append(company_desc)
    
    past_perf = _past_performance_text(getattr(profile, 'past_performance', []) or [])
    if past_perf:
        query_parts.append(past_perf)
    
    query = " ".join(query_parts).strip()

    if query:
        vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            max_features=50000,
        )
        X = vectorizer.fit_transform(corpus)
        q = vectorizer.transform([query])
        sims = cosine_similarity(q, X).flatten()
    else:
        sims = np.zeros(len(filtered), dtype=float)

    w_text, w_rec, w_tag, w_loc, w_past = weights
    results: List[Dict[str, Any]] = []

    for i, r in enumerate(filtered):
        close_dt = _get_dt(r)
        days_until_close = _days_until(close_dt, now)
        rec = _recency_score(days_until_close, profile.max_age_days)

        tags = _get(r, "tags", []) if not isinstance(r, dict) else (r.get("tags") or ([r.get("category")] if r.get("category") else []))
        loc_str = _get(r, "location", "") if not isinstance(r, dict) else (r.get("workloc") or r.get("location") or "")

        tag = _tag_score(tags, profile.selected_tags)
        loc = _location_score(loc_str, profile.location_keywords)

        # Past performance contributes to the text similarity score
        # (already blended in via TF-IDF query with past performance text)
        score = float(w_text * sims[i] + w_rec * rec + w_tag * tag + w_loc * loc + w_past * sims[i])

        rid = _get(r, "id", "") if not isinstance(r, dict) else (str(r.get("externalid") or r.get("id") or ""))
        title = _get(r, "title", "") if not isinstance(r, dict) else (r.get("shortdesc") or r.get("title") or "")
        status = _get(r, "status", "") if not isinstance(r, dict) else (r.get("status") or "")
        desc = _get(r, "description", "") if not isinstance(r, dict) else (r.get("longdesc") or r.get("description") or "")
        link = _get(r, "link", "") if not isinstance(r, dict) else (r.get("link") or "")

        results.append(
            {
                "score": score,
                "text_sim": float(sims[i]),
                "recency": float(rec),
                "tag_match": float(tag),
                "location_match": float(loc),
                "id": rid,
                "title": title,
                "status": status,
                "close_dt": _close_date_str(close_dt),
                "location": loc_str,
                "tags": tags,
                "description": desc,
                "link": link,
            }
        )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[: max(1, int(profile.top_k))]