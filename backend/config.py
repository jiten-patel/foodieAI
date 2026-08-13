"""
Central configuration for the Food Recommendation backend.
All settings are read from environment variables with safe defaults.
"""
import os
from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent  # project root


class Settings(BaseSettings):
    # ── OpenAI ──────────────────────────────────────────────────────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-nano"
    openai_temperature: float = 0.7

    # ── Anthropic (MCP sampling) ────────────────────────────────────────────
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    # ── Gemini (free-tier text embeddings — no local model, no extra memory) ─
    gemini_api_key: str = ""
    gemini_embedding_model: str = "gemini-embedding-001"

    # ── Data paths ──────────────────────────────────────────────────────────
    data_dir: Path = BASE_DIR / "data"
    restaurant_data_file: str = "structured_restaurant_data.json"
    recipe_data_file: str = "augmented_food_recipe.json"
    user_review_file: str = "augmented_user_review.json"
    recipe_images_dir: str = "recipe_images"

    # ── Database ────────────────────────────────────────────────────────────
    database_url: str = ""
    echo_sql: bool = Field(default=False, validation_alias="DATABASE_ECHO_SQL")

    # ── JWT ────────────────────────────────────────────────────────────
    jwt_secret_key: str = ""
    jwt_algorithm : str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── Vector DB ───────────────────────────────────────────────────────────
    chroma_persist_dir: Path = BASE_DIR / ".chroma_db"

    # ── API server ──────────────────────────────────────────────────────────
    api_host: str = "localhost"
    api_port: int = 8000
    api_reload: bool = True
    # No "*" here on purpose: allow_credentials=True in api.py means a wildcard
    # origin is spec-invalid and browsers drop the cookie-bearing response
    # anyway. Set CORS_ORIGINS (JSON list) in prod to the real frontend origin.
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Logging ─────────────────────────────────────────────────────────────
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
