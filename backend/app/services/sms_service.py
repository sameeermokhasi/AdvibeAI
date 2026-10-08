"""
SMS Delivery Service Layer (MSG91 OTP API)
------------------------------------------
Dispatches real SMS OTPs via MSG91's transactional OTP API.
In development mode without credentials, prints OTP to server console.
In production with missing credentials, returns 503 Service Unavailable.
"""

import re
import urllib.request
import urllib.error
import json
from fastapi import HTTPException
from app.core.config import settings
from app.core.logging import logger


def clean_phone_number(phone: str) -> str:
    """Normalize phone string into E.164 standard (+[country][number])."""
    if not phone:
        return ""
    stripped = re.sub(r"[^\d+]", "", phone.strip())
    if not stripped.startswith("+") and len(stripped) == 10:
        stripped = "+91" + stripped
    return stripped


def is_valid_e164(phone: str) -> bool:
    """Validate E.164 format: starts with +, followed by 7 to 15 digits."""
    return bool(re.match(r"^\+[1-9]\d{6,14}$", phone))


def send_sms(phone: str, code: str) -> bool:
    """
    Delivers a 6-digit OTP code to the recipient's phone number.
    Provider-agnostic interface backing MSG91 OTP API.
    """
    cleaned = clean_phone_number(phone)
    if not is_valid_e164(cleaned):
        raise HTTPException(status_code=400, detail="Invalid E.164 phone number format.")

    # Check for MSG91 configuration
    if settings.MSG91_AUTH_KEY and settings.MSG91_TEMPLATE_ID:
        try:
            # MSG91 expects mobile with country code without leading '+'
            mobile_digits = cleaned.lstrip("+")
            
            # If template ID is a campaign slug (e.g. 'advibe-otp')
            if "-" in settings.MSG91_TEMPLATE_ID or "advibe" in settings.MSG91_TEMPLATE_ID.lower():
                url = f"https://control.msg91.com/api/v5/campaign/api/campaigns/{settings.MSG91_TEMPLATE_ID}/run"
                payload = {
                    "data": {
                        "sendTo": [
                            {
                                "to": [
                                    {
                                        "mobiles": mobile_digits,
                                        "variables": {
                                            "OTP": {
                                                "value": str(code)
                                            }
                                        }
                                    }
                                ],
                                "variables": {
                                    "OTP": {
                                        "value": str(code)
                                    }
                                }
                            }
                        ]
                    }
                }
            else:
                url = "https://control.msg91.com/api/v5/otp"
                payload = {
                    "template_id": settings.MSG91_TEMPLATE_ID,
                    "mobile": mobile_digits,
                    "otp": code
                }

            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={
                    "authkey": settings.MSG91_AUTH_KEY,
                    "Content-Type": "application/json",
                    "accept": "application/json"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=10) as resp:
                status_code = resp.status
                body = json.loads(resp.read().decode("utf-8"))

            if status_code == 200 and body.get("type") in ("success", None):
                logger.info(f"SMS successfully accepted by MSG91 for {cleaned[:3]}***{cleaned[-4:]}")
                return True
            else:
                logger.error(f"MSG91 SMS delivery error: {body}")
                raise HTTPException(status_code=502, detail=f"SMS provider error: {body.get('message', 'Delivery rejected')}")

        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8")
            logger.error(f"MSG91 HTTP Error {e.code}: {err_body}")
            raise HTTPException(status_code=502, detail="Failed to deliver SMS via provider.")
        except Exception as e:
            logger.error(f"SMS dispatch failure: {str(e)}")
            raise HTTPException(status_code=502, detail="SMS service temporarily unavailable.")

    # Missing keys in production
    if settings.ENVIRONMENT != "development":
        logger.error("SMS provider not configured (MSG91_AUTH_KEY or MSG91_TEMPLATE_ID missing).")
        raise HTTPException(status_code=503, detail="SMS provider not configured.")

    # Development mode console fallback
    print(
        f"\n======================================================\n"
        f"[DEV SMS CONSOLE] Verification OTP for {cleaned}: {code}\n"
        f"======================================================\n",
        flush=True
    )
    logger.info(f"[DEV SMS CONSOLE] Sent simulated OTP to {cleaned}")
    return True
