"""
Recipe data management service.

Handles CRUD operations against the recipes table in Postgres, with
LLM-powered paragraph → structured JSON extraction and self-healing JSON
validation — same pattern as restaurant_service.py, sharing services/llm.py.

backend/data/augmented_food_recipe.json is kept only as the
one-time seed fixture (see seed_if_empty) — Postgres is the live store.
"""
from __future__ import annotations

import json
import logging
from typing import Optional

from sqlalchemy import func

from config import get_settings
from models import Recipe
from database.db import SessionLocal
from database.models.recipe import Recipe as RecipeModel
from services.llm import extract_json_with_retry

logger = logging.getLogger(__name__)


def _to_dict(row: RecipeModel) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "cuisine": row.cuisine,
        "servings": row.servings,
        "prep_time": row.prep_time,
        "cook_time": row.cook_time,
        "total_time": row.total_time,
        "ingredients": row.ingredients or [],
        "directions": row.directions or [],
    }


# ─── LLM helpers ─────────────────────────────────────────────────────────────

_EXAMPLE_INPUT = (
    "A quick Margherita pizza: knead a 260g dough ball, spread 2 tbsp tomato "
    "sauce, top with mozzarella and fresh basil, drizzle olive oil, bake at "
    "250°C. Serves 2, prep 20 mins, cook 15 mins, total 35 mins."
)
_EXAMPLE_OUTPUT = """{
  "name": "Classic Margherita Pizza",
  "cuisine": "Italian",
  "servings": 2,
  "prep_time": "20 mins",
  "cook_time": "15 mins",
  "total_time": "35 mins",
  "ingredients": ["1 pizza dough ball (about 260g)", "2 tablespoons tomato sauce", "1 cup shredded mozzarella cheese", "6-8 fresh basil leaves", "1 tablespoon olive oil"],
  "directions": ["Preheat oven to 250°C.", "Spread tomato sauce over the dough.", "Top with mozzarella and bake until golden.", "Garnish with fresh basil before serving."]
}"""

_SYSTEM_EXTRACT = """You are an expert recipe-extraction assistant.
Extract structured recipe information from free text and return ONLY valid JSON.

Rules:
1. Return ONLY a JSON object — no markdown fences, no explanations.
2. Missing fields → "" (strings), [] (arrays), null (numbers).
3. Fields: name, cuisine, servings (integer or null), prep_time, cook_time, total_time (short strings like "20 mins"), ingredients (list of strings), directions (list of strings, one step each).
4. Never hallucinate; extract only what is present, keep ingredient/direction wording close to the source.
"""


def parse_recipe_paragraph(paragraph: str) -> dict:
    """
    Use the LLM to convert a free-text recipe description into a validated
    Recipe dict, with up to 3 self-healing retries.
    """
    user_prompt = (
        f"Extract recipe data from this description:\n\n{paragraph}\n\n"
        f"Example input:\n{_EXAMPLE_INPUT}\n\nExample output:\n{_EXAMPLE_OUTPUT}"
    )
    return extract_json_with_retry(
        _SYSTEM_EXTRACT, user_prompt, Recipe.model_validate, kind="recipe"
    )


# ─── Service layer (CRUD) ─────────────────────────────────────────────────────

def get_all_recipes() -> list[dict]:
    with SessionLocal() as db:
        rows = db.query(RecipeModel).order_by(RecipeModel.id).all()
        return [_to_dict(r) for r in rows]


def get_recipe_by_id(recipe_id: int) -> Optional[dict]:
    with SessionLocal() as db:
        row = db.get(RecipeModel, recipe_id)
        return _to_dict(row) if row else None


def add_recipe(paragraph: str) -> dict:
    recipe = parse_recipe_paragraph(paragraph)
    with SessionLocal() as db:
        max_id = db.query(func.max(RecipeModel.id)).scalar() or 0
        new_id = max_id + 1
        recipe["id"] = new_id
        db.add(RecipeModel(
            id=new_id,
            name=recipe.get("name", ""),
            cuisine=recipe.get("cuisine", ""),
            servings=recipe.get("servings"),
            prep_time=recipe.get("prep_time"),
            cook_time=recipe.get("cook_time"),
            total_time=recipe.get("total_time"),
            ingredients=recipe.get("ingredients", []),
            directions=recipe.get("directions", []),
        ))
        db.commit()
    return recipe


def update_recipe(recipe_id: int, paragraph: str) -> Optional[dict]:
    with SessionLocal() as db:
        row = db.get(RecipeModel, recipe_id)
        if row is None:
            return None

        # Only call the (expensive) LLM parse once we know the row exists.
        updated = parse_recipe_paragraph(paragraph)
        row.name = updated.get("name", "")
        row.cuisine = updated.get("cuisine", "")
        row.servings = updated.get("servings")
        row.prep_time = updated.get("prep_time")
        row.cook_time = updated.get("cook_time")
        row.total_time = updated.get("total_time")
        row.ingredients = updated.get("ingredients", [])
        row.directions = updated.get("directions", [])
        db.commit()

    updated["id"] = recipe_id
    return updated


def delete_recipe(recipe_id: int) -> bool:
    with SessionLocal() as db:
        row = db.get(RecipeModel, recipe_id)
        if row is None:
            return False
        db.delete(row)
        db.commit()
        return True


def seed_if_empty() -> None:
    """One-time bootstrap: load the bundled seed JSON into Postgres if the table is empty."""
    if get_all_recipes():
        return
    cfg = get_settings()
    seed_file = cfg.data_dir / cfg.recipe_data_file
    if not seed_file.exists():
        logger.warning("Seed file not found at %s — starting with an empty recipes table.", seed_file)
        return
    with open(seed_file, "r", encoding="utf-8") as fh:
        recipes = json.load(fh)
    with SessionLocal() as db:
        for r in recipes:
            if db.get(RecipeModel, r.get("id")) is not None:
                continue
            db.add(RecipeModel(
                id=r.get("id"),
                name=r.get("name", ""),
                cuisine=r.get("cuisine", ""),
                servings=r.get("servings"),
                prep_time=r.get("prep_time"),
                cook_time=r.get("cook_time"),
                total_time=r.get("total_time"),
                ingredients=r.get("ingredients", []),
                directions=r.get("directions", []),
            ))
        db.commit()
    logger.info("Seeded %d recipes into Postgres", len(recipes))
