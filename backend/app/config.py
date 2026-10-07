import os
import secrets


class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL", "sqlite:///./ente-tasks.db"
    )
    # Used to sign short-lived two-factor challenges and to derive decoy
    # key-derivation parameters for unknown emails. Set this in production.
    secret_key: str = os.getenv("SECRET_KEY") or secrets.token_hex(32)
    cors_origins: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()
    ]
    session_ttl_days: int = int(os.getenv("SESSION_TTL_DAYS", "30"))


settings = Settings()
