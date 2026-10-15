"""
utils/mailer.py — Gmail SMTP email sender for IntentRoute v2
==============================================================
Sends real emails (password reset codes) using Python's built-in `smtplib`
talking to Gmail's SMTP relay — no third-party email API/service needed.

SETUP (one-time, ~2 minutes):
  1. On the Gmail account you want IntentRoute to send from, turn on
     2-Step Verification:  https://myaccount.google.com/security
  2. Create an App Password: https://myaccount.google.com/apppasswords
       App: "Mail"   Device: "Other" → name it "IntentRoute"
     Google will show you a 16-character password like: abcd efgh ijkl mnop
  3. Add these three lines to your `.env` file (see .env.example):
       GMAIL_USER=youraccount@gmail.com
       GMAIL_APP_PASSWORD=abcdefghijklmnop      (no spaces)
       GMAIL_FROM_NAME=IntentRoute

If GMAIL_USER / GMAIL_APP_PASSWORD are not set, send_email() does NOT crash —
it just logs the email to the console and returns False, so local dev keeps
working even before you've set up Gmail. The API also falls back to
returning the code directly in the response in that case (see main.py).
"""

import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

GMAIL_USER          = os.getenv("GMAIL_USER")
GMAIL_APP_PASSWORD  = os.getenv("GMAIL_APP_PASSWORD")
GMAIL_FROM_NAME      = os.getenv("GMAIL_FROM_NAME", "IntentRoute")
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def email_configured() -> bool:
    """True once GMAIL_USER + GMAIL_APP_PASSWORD are set in .env."""
    return bool(GMAIL_USER and GMAIL_APP_PASSWORD)


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Send one email via Gmail SMTP. Returns True on success, False otherwise
    (including the 'not configured yet' case — check the console log)."""
    if not email_configured():
        print(f"[MAIL] GMAIL_USER / GMAIL_APP_PASSWORD not set in .env — "
              f"skipping real send. Would have emailed '{subject}' to {to_email}.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{GMAIL_FROM_NAME} <{GMAIL_USER}>"
    msg["To"] = to_email
    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls(context=context)
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, [to_email], msg.as_string())
        print(f"[MAIL] Sent '{subject}' to {to_email} ✓")
        return True
    except Exception as e:
        print(f"[MAIL] Failed to send to {to_email}: {e}")
        return False


def send_reset_code_email(to_email: str, name: str, code: str) -> bool:
    """Sends the 6-digit password-reset code as a styled HTML email."""
    subject = "Your IntentRoute password reset code"

    text_body = (
        f"Hi {name},\n\n"
        f"Your IntentRoute password reset code is: {code}\n\n"
        f"This code expires in 30 minutes. If you didn't request this, "
        f"you can safely ignore this email.\n\n— IntentRoute, ATME College of Engineering"
    )

    html_body = f"""
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:420px;margin:auto;
                padding:28px;background:#0c1220;color:#d4e4ff;border-radius:18px;
                border:1px solid #1a2d47">
      <div style="font-size:22px;font-weight:700;color:#5b8fff;margin-bottom:2px">
        IntentRoute 🧭
      </div>
      <div style="color:#4a6380;font-size:12px;letter-spacing:.06em;margin-bottom:22px">
        FROM INTENTION TO DESTINATION
      </div>
      <p style="margin:0 0 8px">Hi {name},</p>
      <p style="margin:0 0 18px;color:#b7c8e6">
        Use the code below to reset your password. It expires in <strong>30 minutes</strong>.
      </p>
      <div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;
                  background:#111b2e;border:1.5px solid #1a2d47;border-radius:14px;
                  padding:20px 10px;margin:0 0 20px;color:#eef4ff;font-family:monospace">
        {code}
      </div>
      <p style="color:#4a6380;font-size:12.5px;line-height:1.6;margin:0">
        Didn't request a reset? You can safely ignore this email — your password
        will stay unchanged.
      </p>
    </div>
    """
    return send_email(to_email, subject, html_body, text_body)
