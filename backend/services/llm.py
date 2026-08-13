"""
Shared LLM helpers: paragraph → structured JSON extraction with self-healing
repair retries. Used by both restaurant_service.py and recipe_service.py so
the extraction/retry logic exists in exactly one place.
"""
from __future__ import annotations

import json
import logging
from typing import Callable

from pydantic import ValidationError

from config import get_settings

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_REPAIR = """You are a JSON repair assistant.
Return ONLY valid, corrected JSON. No markdown, no explanations.
Preserve all original data; fix only syntax errors."""


def call_llm(system_msg: str, user_msg: str) -> str:
    """Call the configured LLM (OpenAI)."""
    cfg = get_settings()

    if cfg.openai_api_key:
        from openai import OpenAI
        client = OpenAI(api_key=cfg.openai_api_key)
        resp = client.chat.completions.create(
            model=cfg.openai_model,
            temperature=0.0,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
        )
        content = resp.choices[0].message.content
        return content if content is not None else ""

    return ""


def extract_json_with_retry(
    system_extract: str,
    user_prompt: str,
    validate: Callable[[dict], None],
    kind: str,
    system_repair: str = DEFAULT_SYSTEM_REPAIR,
    max_retries: int = 3,
) -> dict:
    """
    Extract structured JSON from free text via LLM, with up to `max_retries`
    self-healing repair attempts if the JSON is malformed or fails `validate`
    (e.g. a Pydantic model's `.model_validate`).
    """
    response = call_llm(system_extract, user_prompt)

    for attempt in range(max_retries):
        try:
            cleaned = response.strip().strip("```json").strip("```").strip()
            data = json.loads(cleaned)
            validate(data)
            return data
        except (json.JSONDecodeError, ValidationError) as exc:
            logger.warning("%s validation attempt %d failed: %s", kind, attempt + 1, exc)
            if attempt < max_retries - 1:
                repair_prompt = (
                    f"JSON:\n{response}\n\nError:\n{exc}\n\n"
                    "Repair and return ONLY valid JSON."
                )
                response = call_llm(system_repair, repair_prompt)

    logger.error("Failed to produce valid %s JSON after %d attempts.", kind, max_retries)
    raise ValueError(f"Could not parse {kind} paragraph into valid JSON after retries.")
