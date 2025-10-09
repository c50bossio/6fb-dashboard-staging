"""
Twilio SMS Service for Walk-In Waitlist Notifications
Handles sending SMS notifications to customers at different waitlist stages.
"""

import os
from typing import Optional, Dict
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

# Initialize Twilio client
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')

# Validate environment variables
if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
    print("⚠️  WARNING: Twilio credentials not configured. SMS functionality will be disabled.")
    twilio_client = None
else:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except Exception as e:
        print(f"⚠️  WARNING: Failed to initialize Twilio client: {e}")
        twilio_client = None


def send_sms(
    phone_number: str,
    message_content: str,
    notification_type: str
) -> Optional[str]:
    """
    Send SMS notification via Twilio.

    Args:
        phone_number: Recipient phone number in E.164 format (e.g., +15551234567)
        message_content: SMS message text (max 160 characters recommended)
        notification_type: Type of notification (confirmation, almost_ready, ready_now, cancelled)

    Returns:
        str: Twilio message SID if successful, None if failed

    Raises:
        ValueError: If phone number is invalid or message is too long
        TwilioRestException: If Twilio API call fails
    """
    # Validate inputs
    if not phone_number or not phone_number.startswith('+'):
        raise ValueError(f"Invalid phone number format: {phone_number}. Must be E.164 format (+1234567890)")

    if not message_content:
        raise ValueError("Message content cannot be empty")

    if len(message_content) > 1600:  # Twilio's max message length
        raise ValueError(f"Message too long ({len(message_content)} chars). Max 1600 characters.")

    # Check if Twilio is configured
    if not twilio_client:
        print(f"⚠️  Twilio not configured. Would have sent SMS to {phone_number}: {message_content}")
        return None

    try:
        # Send SMS via Twilio
        message = twilio_client.messages.create(
            body=message_content,
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )

        print(f"✓ SMS sent successfully. SID: {message.sid}, Type: {notification_type}")
        return message.sid

    except TwilioRestException as e:
        # Log Twilio-specific errors
        print(f"✗ Twilio error sending SMS to {phone_number}: {e.msg} (Code: {e.code})")

        # Retry logic for transient errors (429 rate limit, 503 service unavailable)
        if e.code in [429, 503]:
            print("Retrying SMS send after transient error...")
            try:
                message = twilio_client.messages.create(
                    body=message_content,
                    from_=TWILIO_PHONE_NUMBER,
                    to=phone_number
                )
                print(f"✓ SMS sent successfully on retry. SID: {message.sid}")
                return message.sid
            except Exception as retry_error:
                print(f"✗ Retry failed: {retry_error}")
                raise

        raise

    except Exception as e:
        print(f"✗ Unexpected error sending SMS: {e}")
        raise


def validate_phone_number(phone_number: str) -> bool:
    """
    Validate phone number format for E.164 compliance.

    Args:
        phone_number: Phone number to validate

    Returns:
        bool: True if valid E.164 format, False otherwise
    """
    if not phone_number:
        return False

    # Basic E.164 validation: starts with +, followed by 1-15 digits
    if not phone_number.startswith('+'):
        return False

    digits = phone_number[1:]
    if not digits.isdigit():
        return False

    if len(digits) < 1 or len(digits) > 15:
        return False

    return True


def format_phone_number(phone_number: str, country_code: str = '+1') -> str:
    """
    Convert phone number to E.164 format.

    Args:
        phone_number: Phone number in various formats (e.g., "(555) 123-4567", "555-123-4567")
        country_code: Country code prefix (default: +1 for US/Canada)

    Returns:
        str: Phone number in E.164 format

    Raises:
        ValueError: If phone number cannot be parsed
    """
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone_number))

    # Handle US/Canada numbers (10 digits)
    if len(digits) == 10:
        return f"{country_code}{digits}"

    # Handle numbers that already include country code
    if len(digits) == 11 and digits.startswith('1'):
        return f"+{digits}"

    # Invalid length
    raise ValueError(f"Invalid phone number: {phone_number}. Expected 10 digits for US/Canada.")


# SMS message templates with TCPA compliance
def generate_confirmation_sms(shop_name: str, position: int, estimated_wait_minutes: int) -> str:
    """Generate check-in confirmation SMS."""
    return (
        f"Thanks for visiting {shop_name}! You're #{position} in line with ~{estimated_wait_minutes} min wait. "
        f"We'll text when you're up! Reply STOP to unsubscribe."
    )


def generate_almost_ready_sms() -> str:
    """Generate 'almost ready' SMS (when customer is 2nd in line)."""
    return "Almost there! You're next in line. Head back when ready. Reply STOP to unsubscribe."


def generate_ready_now_sms(station_number: Optional[int] = None) -> str:
    """Generate 'ready now' SMS (when customer is next)."""
    if station_number:
        return f"You're up! Your barber is ready at station {station_number}. Reply STOP to unsubscribe."
    return "You're up! Your barber is ready. Reply STOP to unsubscribe."


def generate_cancelled_sms() -> str:
    """Generate cancellation confirmation SMS."""
    return "Your waitlist entry has been cancelled. Thanks for visiting!"
