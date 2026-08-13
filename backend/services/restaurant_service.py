"""
Restaurant data management service.

Handles CRUD operations against the restaurants table in Postgres,
with LLM-powered paragraph → structured JSON extraction and
self-healing JSON validation.

backend/data/structured_restaurant_data.json is kept only as the
one-time seed fixture (see seed_if_empty) — Postgres is the live store.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy import func

from config import get_settings
from models import Restaurant
from database.db import SessionLocal
from database.models.restaurant import Restaurant as RestaurantModel
from services.llm import extract_json_with_retry

logger = logging.getLogger(__name__)


def _to_dict(row: RestaurantModel) -> dict:
    return {
        "itemId": row.item_id,
        "name": row.name,
        "location": row.location,
        "type": row.type,
        "food_style": row.food_style,
        "rating": row.rating,
        "price_range": row.price_range,
        "signatures": row.signatures or [],
        "vibe": row.vibe,
        "environment": row.environment,
        "shortcomings": row.shortcomings or [],
    }


# ─── LLM helpers ─────────────────────────────────────────────────────────────

_EXAMPLE_INPUT = (
    "Down in **Santa Monica**, **Mar de Cortez** serves as a **sun-drenched**, "
    "**casual taqueria** specializing in **Baja-style seafood**. Rating: **4.2/5**. "
    "Price range: $$"
)
_EXAMPLE_OUTPUT = """{
  "name": "Mar de Cortez",
  "location": "Santa Monica",
  "type": "casual taqueria",
  "food_style": "Baja-style seafood",
  "rating": 4.2,
  "price_range": 2,
  "signatures": ["beer-battered snapper tacos", "zesty octopus ceviche"],
  "vibe": "salt-air energy",
  "environment": "sun-drenched spot for open-air dining near the pier",
  "shortcomings": []
}"""

_SYSTEM_EXTRACT = """You are an expert information-extraction assistant.
Extract structured restaurant information from free text and return ONLY valid JSON.

Rules:
1. Return ONLY a JSON object — no markdown fences, no explanations.
2. Missing fields → "" (strings), [] (arrays), null (numbers).
3. Price range: "$"→1, "$$"→2, "$$$"→3, "$$$$"→4.
4. Fields: name, location, type, food_style, rating, price_range, signatures, vibe, environment, shortcomings.
5. Never hallucinate; extract only what is present.
"""

def parse_restaurant_paragraph(paragraph: str) -> dict:
    """
    Use the LLM to convert a free-text restaurant description into a
    validated Restaurant dict, with up to 3 self-healing retries.
    """
    user_prompt = (
        f"Extract restaurant data from this description:\n\n{paragraph}\n\n"
        f"Example input:\n{_EXAMPLE_INPUT}\n\nExample output:\n{_EXAMPLE_OUTPUT}"
    )
    return extract_json_with_retry(
        _SYSTEM_EXTRACT, user_prompt, Restaurant.model_validate, kind="restaurant"
    )


# ─── Service layer (CRUD) ─────────────────────────────────────────────────────

def get_all_restaurants() -> list[dict]:
    with SessionLocal() as db:
        rows = db.query(RestaurantModel).order_by(RestaurantModel.item_id).all()
        return [_to_dict(r) for r in rows]


def get_restaurant_by_id(item_id: int) -> Optional[dict]:
    with SessionLocal() as db:
        row = db.get(RestaurantModel, item_id)
        return _to_dict(row) if row else None


def add_restaurant(paragraph: str) -> dict:
    restaurant = parse_restaurant_paragraph(paragraph)
    with SessionLocal() as db:
        max_id = db.query(func.max(RestaurantModel.item_id)).scalar() or 1_000_000
        new_id = max_id + 1
        restaurant["itemId"] = new_id
        db.add(RestaurantModel(
            item_id=new_id,
            name=restaurant.get("name", ""),
            location=restaurant.get("location", ""),
            type=restaurant.get("type", ""),
            food_style=restaurant.get("food_style", ""),
            rating=restaurant.get("rating"),
            price_range=restaurant.get("price_range"),
            signatures=restaurant.get("signatures", []),
            vibe=restaurant.get("vibe"),
            environment=restaurant.get("environment", ""),
            shortcomings=restaurant.get("shortcomings", []),
        ))
        db.commit()
    return restaurant


def update_restaurant(item_id: int, paragraph: str) -> Optional[dict]:
    with SessionLocal() as db:
        row = db.get(RestaurantModel, item_id)
        if row is None:
            return None

        # Only call the (expensive) LLM parse once we know the row exists.
        updated = parse_restaurant_paragraph(paragraph)
        row.name = updated.get("name", "")
        row.location = updated.get("location", "")
        row.type = updated.get("type", "")
        row.food_style = updated.get("food_style", "")
        row.rating = updated.get("rating","")
        row.price_range = updated.get("price_range","")
        row.signatures = updated.get("signatures", [])
        row.vibe = updated.get("vibe","")
        row.environment = updated.get("environment", "")
        row.shortcomings = updated.get("shortcomings", [])
        db.commit()

    updated["itemId"] = item_id
    return updated


def delete_restaurant(item_id: int) -> bool:
    with SessionLocal() as db:
        row = db.get(RestaurantModel, item_id)
        if row is None:
            return False
        db.delete(row)
        db.commit()
        return True


def seed_if_empty() -> None:
    """One-time bootstrap: load the bundled seed JSON into Postgres if the table is empty."""
    if get_all_restaurants():
        return
    cfg = get_settings()
    seed_file = cfg.data_dir / cfg.restaurant_data_file
    if not seed_file.exists():
        logger.warning("Seed file not found at %s — starting with an empty restaurants table.", seed_file)
        return
    with open(seed_file, "r", encoding="utf-8") as fh:
        restaurants = json.load(fh)
    with SessionLocal() as db:
        for r in restaurants:
            if db.get(RestaurantModel, r.get("itemId")) is not None:
                continue
            db.add(RestaurantModel(
                item_id=r.get("itemId"),
                name=r.get("name", ""),
                location=r.get("location", ""),
                type=r.get("type", ""),
                food_style=r.get("food_style", ""),
                rating=r.get("rating"),
                price_range=r.get("price_range"),
                signatures=r.get("signatures", []),
                vibe=r.get("vibe"),
                environment=r.get("environment", ""),
                shortcomings=r.get("shortcomings", []),
            ))
        db.commit()
    logger.info("Seeded %d restaurants into Postgres", len(restaurants))
