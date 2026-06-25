"""
Subscription manager — all Supabase user/quota logic lives here.
Nothing in phases/ or main.py should import supabase directly.
"""
import os
from datetime import date
from supabase import create_client, Client

_sb: Client | None = None


def _client() -> Client:
    global _sb
    if _sb is None:
        _sb = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return _sb


# ── Tier limits ────────────────────────────────────────────────
LIMITS = {
    "free":   {"critical": 1, "medium": 1},   # 2 total/month
    "hunter": {"critical": 999, "medium": 999},
    "team":   {"critical": 999, "medium": 999},
}


def get_or_create_user(machine_id: str) -> dict:
    """Get user row, creating it if first time."""
    sb = _client()
    result = sb.table("users").select("*").eq("machine_id", machine_id).execute()
    if result.data:
        user = result.data[0]
        # Reset monthly counters if new month
        if user["reset_date"] != str(date.today().replace(day=1)):
            sb.table("users").update({
                "critical_used": 0,
                "medium_used": 0,
                "reset_date": str(date.today().replace(day=1)),
            }).eq("machine_id", machine_id).execute()
            user["critical_used"] = 0
            user["medium_used"] = 0
        return user
    # First visit — create user
    sb.table("users").insert({"machine_id": machine_id, "reset_date": str(date.today().replace(day=1))}).execute()
    return get_or_create_user(machine_id)


def can_scan(machine_id: str) -> tuple[bool, str]:
    """
    Returns (allowed: bool, reason: str).
    Checks quota BEFORE running the pipeline.
    """
    user = get_or_create_user(machine_id)
    tier = user["tier"]
    limits = LIMITS[tier]

    # For free tier: check if any quota remains
    if tier == "free":
        remaining_critical = limits["critical"] - user["critical_used"]
        remaining_medium   = limits["medium"]   - user["medium_used"]
        if remaining_critical <= 0 and remaining_medium <= 0:
            return False, (
                "Free tier limit reached (1 critical + 1 medium per month). "
                "Upgrade to Hunter ($59/mo) for unlimited scans."
            )
    return True, "ok"


def record_finding(machine_id: str, severity: str):
    """Call this after a confirmed finding is returned to the user."""
    user = get_or_create_user(machine_id)
    if user["tier"] != "free":
        return  # no tracking needed for paid tiers
    sev = severity.lower()
    if sev == "critical":
        _client().table("users").update(
            {"critical_used": user["critical_used"] + 1}
        ).eq("machine_id", machine_id).execute()
    elif sev in ("high", "medium"):
        _client().table("users").update(
            {"medium_used": user["medium_used"] + 1}
        ).eq("machine_id", machine_id).execute()


def get_status(machine_id: str) -> dict:
    """Returns what the extension shows in its header."""
    user = get_or_create_user(machine_id)
    tier = user["tier"]
    if tier == "free":
        limits = LIMITS["free"]
        return {
            "tier": "free",
            "critical_remaining": limits["critical"] - user["critical_used"],
            "medium_remaining":   limits["medium"]   - user["medium_used"],
            "can_scan": (
                (user["critical_used"] < limits["critical"]) or
                (user["medium_used"]   < limits["medium"])
            ),
        }
    return {"tier": tier, "critical_remaining": 999, "medium_remaining": 999, "can_scan": True}


def upgrade_user(machine_id: str, tier: str):
    """Called after payment confirmed."""
    _client().table("users").update({"tier": tier}).eq("machine_id", machine_id).execute()
