"""
NOWPayments integration.
Creates payment invoices and handles IPN webhooks.
"""
import os
import hashlib
import hmac
import httpx

NOWPAY_BASE = "https://api.nowpayments.io/v1"


def create_invoice(machine_id: str, tier: str = "hunter") -> dict:
    """
    Creates a NOWPayments invoice for $59 (hunter) or $349 (team).
    Returns {"payment_url": "...", "payment_id": "..."}
    """
    prices = {"hunter": 59, "team": 349}
    amount = prices.get(tier, 59)

    resp = httpx.post(
        f"{NOWPAY_BASE}/invoice",
        headers={"x-api-key": os.environ["NOWPAYMENTS_API_KEY"]},
        json={
            "price_amount": amount,
            "price_currency": "usd",
            "pay_currency": "usdcmatic",    # USDC on Polygon — low fees
            "order_id": f"sireen_{machine_id}_{tier}",
            "order_description": f"Sireen {tier.capitalize()} — 1 month",
            "ipn_callback_url": f"{os.environ['SIREEN_BACKEND_URL']}/payment/webhook",
            "success_url": "https://gaolaif.io/payment-success",
            "cancel_url":  "https://gaolaif.io/payment-cancel",
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    return {"payment_url": data["invoice_url"], "payment_id": data["id"]}


def verify_ipn_signature(payload_bytes: bytes, received_sig: str) -> bool:
    """Verifies the HMAC-SHA512 signature NOWPayments sends with every IPN."""
    secret = os.environ["NOWPAYMENTS_IPN_SECRET"].encode()
    expected = hmac.new(secret, payload_bytes, hashlib.sha512).hexdigest()
    return hmac.compare_digest(expected, received_sig.lower())


def parse_ipn(body: dict) -> dict:
    """
    Returns {"payment_id", "status", "order_id"} from the IPN body.
    Status values: waiting | confirming | confirmed | finished | failed
    """
    return {
        "payment_id": str(body.get("payment_id", "")),
        "status":     body.get("payment_status", ""),
        "order_id":   body.get("order_id", ""),
    }
