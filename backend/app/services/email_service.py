import logging
import smtplib
from email.message import EmailMessage
from os import getenv

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    smtp_host = getenv("SMTP_HOST")
    smtp_port = int(getenv("SMTP_PORT", "587"))
    smtp_user = getenv("SMTP_USER")
    smtp_password = getenv("SMTP_PASSWORD")
    smtp_from = getenv("SMTP_FROM", smtp_user or "no-reply@travelsplit.local")
    smtp_use_tls = getenv("SMTP_USE_TLS", "true").lower() == "true"

    if not smtp_host or not smtp_user or not smtp_password:
        logger.warning("Password reset link for %s: %s", to_email, reset_link)
        print(f"Password reset link for {to_email}: {reset_link}")
        return

    message = EmailMessage()
    message["Subject"] = "Recupera tu contraseña de TravelSplit"
    message["From"] = smtp_from
    message["To"] = to_email
    message.set_content(
        "Hola,\n\n"
        "Recibimos una solicitud para restablecer tu contraseña de TravelSplit.\n"
        f"Usa este enlace para crear una nueva contraseña:\n\n{reset_link}\n\n"
        "El enlace vence en 15 minutos. Si no solicitaste este cambio, puedes ignorar este correo.\n"
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
        if smtp_use_tls:
            smtp.starttls()
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(message)
