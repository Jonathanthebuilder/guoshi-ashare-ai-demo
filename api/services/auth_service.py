from __future__ import annotations

import base64
import hashlib
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Optional
from uuid import uuid4

from cryptography.fernet import Fernet, InvalidToken
import jwt
from jwt.exceptions import PyJWTError as JWTError
from sqlalchemy.orm import Session

from api.database import EmailVerificationCodeDB, UserDB, UserLLMConfigDB, UserLLMProfileDB


ALGORITHM = "HS256"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


_DEFAULT_SECRET = "tradingagents-ashare-dev-secret"


def _secret_key() -> str:
    return os.getenv("TA_APP_SECRET_KEY") or _DEFAULT_SECRET


def _fernet_from_key(key: str) -> Fernet:
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _fernet() -> Fernet:
    return _fernet_from_key(_secret_key())


def is_custom_secret_configured() -> bool:
    return bool(os.getenv("TA_APP_SECRET_KEY"))


def encrypt_secret(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_secret(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return None


def decrypt_secret_with_fallback(value: Optional[str]) -> Optional[str]:
    """Decrypt trying current key first, then default key as fallback."""
    if not value:
        return None
    # Try current key
    try:
        return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        pass
    # Try default key (first-time migration: no key → custom key)
    if is_custom_secret_configured():
        try:
            return _fernet_from_key(_DEFAULT_SECRET).decrypt(value.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            pass
    return None


def normalize_email(email: str) -> str:
    return email.strip().lower()


def generate_login_code() -> str:
    return f"{secrets.randbelow(1000000):06d}"


def hash_code(email: str, code: str) -> str:
    return hashlib.sha256(f"{normalize_email(email)}:{code}:{_secret_key()}".encode("utf-8")).hexdigest()


def create_access_token(user: UserDB, expires_days: int = 30) -> str:
    now = _utcnow()
    payload = {
        "sub": user.id,
        "email": user.email,
        "exp": now + timedelta(days=expires_days),
        "iat": now,
    }
    return jwt.encode(payload, _secret_key(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, _secret_key(), algorithms=[ALGORITHM])


def get_user_by_email(db: Session, email: str) -> Optional[UserDB]:
    return db.query(UserDB).filter(UserDB.email == normalize_email(email)).first()


def get_user_by_id(db: Session, user_id: str) -> Optional[UserDB]:
    return db.query(UserDB).filter(UserDB.id == user_id).first()


def upsert_login_code(db: Session, email: str, purpose: str = "login") -> str:
    email = normalize_email(email)
    code = generate_login_code()
    now = _utcnow()

    db.query(EmailVerificationCodeDB).filter(
        EmailVerificationCodeDB.email == email,
        EmailVerificationCodeDB.purpose == purpose,
        EmailVerificationCodeDB.consumed_at.is_(None),
    ).update({"consumed_at": now})

    row = EmailVerificationCodeDB(
        id=str(uuid4()),
        email=email,
        code_hash=hash_code(email, code),
        purpose=purpose,
        expires_at=now + timedelta(minutes=10),
        created_at=now,
    )
    db.add(row)
    db.commit()
    return code


def verify_login_code(db: Session, email: str, code: str, purpose: str = "login", client_ip: Optional[str] = None) -> Optional[UserDB]:
    email = normalize_email(email)
    now = _utcnow()
    code_row = (
        db.query(EmailVerificationCodeDB)
        .filter(
            EmailVerificationCodeDB.email == email,
            EmailVerificationCodeDB.purpose == purpose,
            EmailVerificationCodeDB.consumed_at.is_(None),
        )
        .order_by(EmailVerificationCodeDB.created_at.desc())
        .first()
    )
    expires_at = _as_utc(code_row.expires_at) if code_row else None
    if not code_row or not expires_at or expires_at < now:
        return None
    if code_row.code_hash != hash_code(email, code):
        return None

    code_row.consumed_at = now
    user = get_user_by_email(db, email)
    if not user:
        user = UserDB(
            id=str(uuid4()),
            email=email,
            is_active=True,
            created_at=now,
            updated_at=now,
            last_login_at=now,
            last_login_ip=client_ip,
        )
        db.add(user)
    else:
        user.last_login_at = now
        user.last_login_ip = client_ip
        user.updated_at = now
    db.commit()
    db.refresh(user)
    return user


def get_env_alias(keys: list[str], default: str = "") -> str:
    for k in keys:
        v = os.getenv(k)
        if v is not None:
            return v
    return default


def send_login_code(email: str, code: str) -> Optional[str]:
    smtp_host = get_env_alias(["MAIL_HOST", "MAIL_SERVER", "SMTP_HOST"]).strip()
    if not smtp_host:
        print(f"[auth] login code for {email}: {code}")
        if os.getenv("APP_ENV", "development") != "production":
            return code
        return None

    smtp_port = int(get_env_alias(["MAIL_PORT", "SMTP_PORT"]) or "587")
    smtp_user = get_env_alias(["MAIL_USER", "MAIL_USERNAME", "SMTP_USER"]).strip()
    smtp_password = get_env_alias(["MAIL_PASS", "MAIL_PASSWORD", "SMTP_PASSWORD"]).strip()
    smtp_from = get_env_alias(["MAIL_FROM", "SMTP_FROM"], smtp_user or "noreply@example.com").strip()
    
    # 兼容旧版的逻辑
    smtp_starttls_str = get_env_alias(["MAIL_STARTTLS", "SMTP_TLS"], "1").strip().lower()
    smtp_starttls = smtp_starttls_str not in ("0", "false", "off", "no")
    
    smtp_ssl_tls_str = get_env_alias(["MAIL_SSL", "MAIL_SSL_TLS"], "0").strip().lower()
    smtp_ssl_tls = smtp_ssl_tls_str in ("1", "true", "on", "yes")

    msg = EmailMessage()
    msg["Subject"] = "TradingAgents 登录验证码"
    msg["From"] = smtp_from
    msg["To"] = email
    msg.set_content(f"你的 TradingAgents 登录验证码是：{code}\n\n10 分钟内有效。")

    try:
        print(f"[auth] connecting to {smtp_host}:{smtp_port} (SSL: {smtp_ssl_tls}, STARTTLS: {smtp_starttls})")
        smtp_cls = smtplib.SMTP_SSL if smtp_ssl_tls else smtplib.SMTP
        with smtp_cls(smtp_host, smtp_port, timeout=20) as server:
            if smtp_starttls and not smtp_ssl_tls:
                server.starttls()
            if smtp_user:
                server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return None
    except Exception as e:
        print(f"[auth] failed to send email via {smtp_host}: {e}")
        print(f"[auth] falling back to console log. code for {email}: {code}")
        if os.getenv("APP_ENV", "development") != "production":
            return code
        return None


def get_user_llm_config(db: Session, user_id: str) -> Optional[UserLLMConfigDB]:
    return db.query(UserLLMConfigDB).filter(UserLLMConfigDB.user_id == user_id).first()


def upsert_user_llm_config(
    db: Session,
    user_id: str,
    *,
    llm_provider: Optional[str] = None,
    backend_url: Optional[str] = None,
    quick_think_llm: Optional[str] = None,
    deep_think_llm: Optional[str] = None,
    max_debate_rounds: Optional[int] = None,
    max_risk_discuss_rounds: Optional[int] = None,
    api_key: Optional[str] = None,
    wecom_webhook_url: Optional[str] = None,
    clear_api_key: bool = False,
    clear_wecom_webhook: bool = False,
    default_analysts: Optional[list] = None,
) -> UserLLMConfigDB:
    row = get_user_llm_config(db, user_id)
    now = _utcnow()
    if not row:
        row = UserLLMConfigDB(user_id=user_id, created_at=now, updated_at=now)
        db.add(row)

    if llm_provider is not None:
        row.llm_provider = llm_provider
    if backend_url is not None:
        row.backend_url = backend_url
    if quick_think_llm is not None:
        row.quick_think_llm = quick_think_llm
    if deep_think_llm is not None:
        row.deep_think_llm = deep_think_llm
    if max_debate_rounds is not None:
        row.max_debate_rounds = max_debate_rounds
    if max_risk_discuss_rounds is not None:
        row.max_risk_discuss_rounds = max_risk_discuss_rounds

    if clear_api_key:
        row.api_key_encrypted = None
    elif api_key:
        row.api_key_encrypted = encrypt_secret(api_key)

    if clear_wecom_webhook:
        row.wecom_webhook_encrypted = None
    elif wecom_webhook_url:
        row.wecom_webhook_encrypted = encrypt_secret(wecom_webhook_url)

    if default_analysts is not None:
        import json
        row.default_analysts = json.dumps(default_analysts)

    row.updated_at = now
    db.commit()
    db.refresh(row)
    return row


def create_demo_user(db: Session, nickname: Optional[str] = None, client_ip: Optional[str] = None) -> UserDB:
    """Create a guest/demo user session for attendees scanning QR codes."""
    now = _utcnow()
    rand_suffix = secrets.token_hex(3)
    email = f"demo_{rand_suffix}@demo.local"
    user = UserDB(
        id=str(uuid4()),
        email=email,
        is_active=True,
        created_at=now,
        updated_at=now,
        last_login_at=now,
        last_login_ip=client_ip,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_user_llm_profiles(db: Session, user_id: str) -> list[UserLLMProfileDB]:
    profiles = (
        db.query(UserLLMProfileDB)
        .filter(UserLLMProfileDB.user_id == user_id)
        .order_by(UserLLMProfileDB.is_default.desc(), UserLLMProfileDB.created_at.asc())
        .all()
    )
    if not profiles:
        # 1. Check if legacy UserLLMConfigDB exists and migrate if it has data
        legacy = get_user_llm_config(db, user_id)
        if legacy and (legacy.llm_provider or legacy.api_key_encrypted or legacy.backend_url):
            provider = legacy.llm_provider or "openai"
            name = f"默认配置 ({provider})"
            default_profile = UserLLMProfileDB(
                id=str(uuid4()),
                user_id=user_id,
                name=name,
                provider=provider,
                backend_url=legacy.backend_url,
                quick_think_llm=legacy.quick_think_llm,
                deep_think_llm=legacy.deep_think_llm,
                api_key_encrypted=legacy.api_key_encrypted,
                is_default=True,
                created_at=_utcnow(),
                updated_at=_utcnow(),
            )
            db.add(default_profile)
            db.commit()
            db.refresh(default_profile)
            return [default_profile]

        # 2. Check if master/admin profiles exist from other users (e.g. 1@23.com or the primary user)
        # and automatically clone them so demo visitors and new accounts immediately have access to the preset models & keys!
        master_profiles = (
            db.query(UserLLMProfileDB)
            .filter(UserLLMProfileDB.user_id != user_id)
            .order_by(UserLLMProfileDB.is_default.desc(), UserLLMProfileDB.created_at.asc())
            .all()
        )
        if master_profiles:
            admin_user = get_user_by_email(db, "1@23.com")
            source_user_id = admin_user.id if admin_user else master_profiles[0].user_id
            cloned = []
            now = _utcnow()
            for p in master_profiles:
                if p.user_id == source_user_id:
                    new_p = UserLLMProfileDB(
                        id=str(uuid4()),
                        user_id=user_id,
                        name=p.name,
                        provider=p.provider,
                        backend_url=p.backend_url,
                        quick_think_llm=p.quick_think_llm,
                        deep_think_llm=p.deep_think_llm,
                        api_key_encrypted=p.api_key_encrypted,
                        is_default=p.is_default,
                        created_at=now,
                        updated_at=now,
                    )
                    db.add(new_p)
                    cloned.append(new_p)
            if cloned:
                db.commit()
                for cp in cloned:
                    db.refresh(cp)
                return cloned

        # 3. If database has no profiles at all anywhere, check environment variables (.env)!
        env_key = os.getenv("TA_API_KEY")
        if env_key:
            env_provider = os.getenv("TA_LLM_PROVIDER", "openai")
            env_url = os.getenv("TA_BASE_URL", "https://api.openai.com/v1")
            env_quick = os.getenv("TA_LLM_QUICK", "gpt-4o-mini")
            env_deep = os.getenv("TA_LLM_DEEP", "gpt-4o")
            default_profile = UserLLMProfileDB(
                id=str(uuid4()),
                user_id=user_id,
                name="系统预置模型 (全局)",
                provider=env_provider,
                backend_url=env_url,
                quick_think_llm=env_quick,
                deep_think_llm=env_deep,
                api_key_encrypted=encrypt_secret(env_key),
                is_default=True,
                created_at=_utcnow(),
                updated_at=_utcnow(),
            )
            db.add(default_profile)
            db.commit()
            db.refresh(default_profile)
            return [default_profile]

    return profiles


def get_user_llm_profile(db: Session, user_id: str, profile_id: str) -> Optional[UserLLMProfileDB]:
    profile = (
        db.query(UserLLMProfileDB)
        .filter(UserLLMProfileDB.user_id == user_id, UserLLMProfileDB.id == profile_id)
        .first()
    )
    if profile:
        return profile
    # Fallback: check if this profile_id exists anywhere (e.g. shared preset profile)
    return (
        db.query(UserLLMProfileDB)
        .filter(UserLLMProfileDB.id == profile_id)
        .first()
    )



def get_default_user_llm_profile(db: Session, user_id: str) -> Optional[UserLLMProfileDB]:
    profile = (
        db.query(UserLLMProfileDB)
        .filter(UserLLMProfileDB.user_id == user_id, UserLLMProfileDB.is_default == True)
        .first()
    )
    if profile:
        return profile
    profiles = list_user_llm_profiles(db, user_id)
    return profiles[0] if profiles else None


def create_user_llm_profile(
    db: Session,
    user_id: str,
    *,
    name: str,
    provider: str = "openai",
    backend_url: Optional[str] = None,
    quick_think_llm: Optional[str] = None,
    deep_think_llm: Optional[str] = None,
    api_key: Optional[str] = None,
    is_default: bool = False,
) -> UserLLMProfileDB:
    now = _utcnow()
    existing_count = db.query(UserLLMProfileDB).filter(UserLLMProfileDB.user_id == user_id).count()
    if existing_count == 0:
        is_default = True

    if is_default:
        db.query(UserLLMProfileDB).filter(UserLLMProfileDB.user_id == user_id).update({"is_default": False})

    profile = UserLLMProfileDB(
        id=str(uuid4()),
        user_id=user_id,
        name=name.strip() or "未命名模型配置",
        provider=provider.strip() or "openai",
        backend_url=backend_url.strip() if backend_url else None,
        quick_think_llm=quick_think_llm.strip() if quick_think_llm else None,
        deep_think_llm=deep_think_llm.strip() if deep_think_llm else None,
        api_key_encrypted=encrypt_secret(api_key.strip()) if api_key and api_key.strip() else None,
        is_default=is_default,
        created_at=now,
        updated_at=now,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def update_user_llm_profile(
    db: Session,
    user_id: str,
    profile_id: str,
    *,
    name: Optional[str] = None,
    provider: Optional[str] = None,
    backend_url: Optional[str] = None,
    quick_think_llm: Optional[str] = None,
    deep_think_llm: Optional[str] = None,
    api_key: Optional[str] = None,
    clear_api_key: bool = False,
    is_default: Optional[bool] = None,
) -> Optional[UserLLMProfileDB]:
    profile = get_user_llm_profile(db, user_id, profile_id)
    if not profile:
        return None

    now = _utcnow()
    if name is not None:
        profile.name = name.strip() or "未命名模型配置"
    if provider is not None:
        profile.provider = provider.strip() or "openai"
    if backend_url is not None:
        profile.backend_url = backend_url.strip() or None
    if quick_think_llm is not None:
        profile.quick_think_llm = quick_think_llm.strip() or None
    if deep_think_llm is not None:
        profile.deep_think_llm = deep_think_llm.strip() or None

    if clear_api_key:
        profile.api_key_encrypted = None
    elif api_key and api_key.strip():
        profile.api_key_encrypted = encrypt_secret(api_key.strip())

    if is_default is not None:
        if is_default:
            db.query(UserLLMProfileDB).filter(
                UserLLMProfileDB.user_id == user_id,
                UserLLMProfileDB.id != profile_id,
            ).update({"is_default": False})
            profile.is_default = True
        else:
            profile.is_default = False

    profile.updated_at = now
    db.commit()
    db.refresh(profile)
    return profile


def delete_user_llm_profile(db: Session, user_id: str, profile_id: str) -> bool:
    profile = get_user_llm_profile(db, user_id, profile_id)
    if not profile:
        return False

    was_default = profile.is_default
    db.delete(profile)
    db.commit()

    if was_default:
        next_profile = (
            db.query(UserLLMProfileDB)
            .filter(UserLLMProfileDB.user_id == user_id)
            .order_by(UserLLMProfileDB.created_at.asc())
            .first()
        )
        if next_profile:
            next_profile.is_default = True
            db.commit()

    return True


def set_default_user_llm_profile(db: Session, user_id: str, profile_id: str) -> Optional[UserLLMProfileDB]:
    profile = get_user_llm_profile(db, user_id, profile_id)
    if not profile:
        return None

    db.query(UserLLMProfileDB).filter(UserLLMProfileDB.user_id == user_id).update({"is_default": False})
    profile.is_default = True
    profile.updated_at = _utcnow()
    db.commit()
    db.refresh(profile)
    return profile

