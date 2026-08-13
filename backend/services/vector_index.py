"""
Vector Index service.

Builds and persists ChromaDB collections of restaurant and recipe text
embeddings, using Google Gemini's free `text-embedding-004` API — a plain
HTTP call, no local model weights, so it adds no memory on top of the
FastAPI process (unlike the earlier CLIP/torch path, dropped for
exceeding Render's free-tier 512MB limit).

Run as a script to (re)build the index:
    python -m backend.services.vector_index
"""
from __future__ import annotations

import logging
import os
import shutil
from typing import Optional

import httpx
import numpy as np
import tenacity
from langchain_chroma import Chroma
from langchain_core.documents import Document

from config import get_settings
from services.restaurant_service import get_all_restaurants
from services.recipe_service import get_all_recipes

logger = logging.getLogger(__name__)

_GEMINI_EMBED_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:embedContent"
_EMBED_DIM = 768  # gemini-embedding-001 defaults to 3072; 768 is plenty for this corpus and keeps Chroma small


def _is_retryable(exc: BaseException) -> bool:
    return isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in (429, 500, 502, 503, 504)

# ─── Lazy singletons ─────────────────────────────────────────────────────────
_article_db: Optional[Chroma] = None
_recipe_db: Optional[Chroma] = None
_image_db: Optional[Chroma] = None


def get_dbs() -> tuple[Chroma, Chroma]:
    """Return (article_db, image_db), opening connections lazily.

    image_db stays empty (no image data source); kept so callers that
    expect two collections don't need to change.
    """
    global _article_db, _image_db
    if _article_db is None or _image_db is None:
        cfg = get_settings()
        db_dir = str(cfg.chroma_persist_dir)
        _article_db = Chroma(
            collection_name="restaurant_articles",
            persist_directory=db_dir,
        )
        _image_db = Chroma(
            collection_name="food_images",
            persist_directory=db_dir,
        )
    return _article_db, _image_db


def get_recipe_db() -> Chroma:
    """Return the recipe collection, opening it lazily."""
    global _recipe_db
    if _recipe_db is None:
        cfg = get_settings()
        _recipe_db = Chroma(
            collection_name="recipe_articles",
            persist_directory=str(cfg.chroma_persist_dir),
        )
    return _recipe_db


# ─── Embedding helpers ────────────────────────────────────────────────────────

@tenacity.retry(
    retry=tenacity.retry_if_exception(_is_retryable),
    wait=tenacity.wait_exponential(multiplier=2, min=2, max=30),
    stop=tenacity.stop_after_attempt(5),
    reraise=True,
)
def _embed_one(client: httpx.Client, url: str, api_key: str, text: str) -> list[float]:
    resp = client.post(
        url,
        params={"key": api_key},
        json={"content": {"parts": [{"text": text}]}, "outputDimensionality": _EMBED_DIM},
    )
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


def embed_texts(texts: list[str]) -> np.ndarray:
    """Embed texts via Gemini's free gemini-embedding-001 API (no local model).

    No synchronous batch endpoint is available for this model, so this is
    one HTTP call per text — fine for occasional index builds, not meant
    for high-frequency embedding.
    """
    cfg = get_settings()
    if not cfg.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured — set it in backend/.env")

    url = _GEMINI_EMBED_URL.format(model=cfg.gemini_embedding_model)
    with httpx.Client(timeout=30.0) as client:
        vecs = [_embed_one(client, url, cfg.gemini_api_key, t) for t in texts]
    return np.array(vecs, dtype=np.float32)


# ─── Index builder ────────────────────────────────────────────────────────────

def build_index(reset: bool = False) -> None:
    """
    Build (or rebuild) the vector index from the data files.

    Args:
        reset: If True, wipe the existing index before rebuilding.
    """
    cfg = get_settings()
    db_dir = str(cfg.chroma_persist_dir)

    if reset and os.path.isdir(db_dir):
        shutil.rmtree(db_dir)
        logger.info("Removed existing index at %s", db_dir)

    # ── Restaurants ──
    restaurants = get_all_restaurants()
    logger.info("Restaurants: %d", len(restaurants))

    article_docs: list[Document] = []
    for r in restaurants:
        name = str(r.get("name", "")).strip()
        if not name:
            continue
        text = (
            f"Restaurant: {name}\n"
            f"Cuisine: {r.get('food_style', '')}\n"
            f"Location: {r.get('location', '')}\n"
            f"Vibe: {r.get('vibe', '')}\n"
            f"Environment: {r.get('environment', '')}"
        )
        article_docs.append(
            Document(
                page_content=text.strip(),
                metadata={
                    "doc_id": f"rest_{r.get('itemId')}",
                    "name": name,
                    "cuisine": r.get("food_style"),
                    "location": r.get("location"),
                    "rating": r.get("rating") or 0.0,
                    "price_range": r.get("price_range") or 0,
                    "source": "restaurant",
                },
            )
        )

    a_db, _ = get_dbs()
    if article_docs:
        A = embed_texts([d.page_content for d in article_docs])
        a_db._collection.upsert(
            ids=[d.metadata["doc_id"] for d in article_docs],
            embeddings=A.tolist(),
            documents=[d.page_content for d in article_docs],
            metadatas=[d.metadata for d in article_docs],
        )
        logger.info("Article DB: upserted %d records", len(article_docs))

    # ── Recipes ──
    recipes = get_all_recipes()
    logger.info("Recipes: %d", len(recipes))

    recipe_docs: list[Document] = []
    for r in recipes:
        name = str(r.get("name", "")).strip()
        if not name:
            continue
        text = (
            f"Recipe: {name}\n"
            f"Cuisine: {r.get('cuisine', '')}\n"
            f"Prep time: {r.get('prep_time', '')}\n"
            f"Ingredients: {', '.join(r.get('ingredients', []))}"
        )
        recipe_docs.append(
            Document(
                page_content=text.strip(),
                metadata={
                    "doc_id": f"recipe_{r.get('id')}",
                    "name": name,
                    "cuisine": r.get("cuisine"),
                    "prep_time": r.get("prep_time"),
                    "source": "recipe",
                },
            )
        )

    r_db = get_recipe_db()
    if recipe_docs:
        R = embed_texts([d.page_content for d in recipe_docs])
        r_db._collection.upsert(
            ids=[d.metadata["doc_id"] for d in recipe_docs],
            embeddings=R.tolist(),
            documents=[d.page_content for d in recipe_docs],
            metadatas=[d.metadata for d in recipe_docs],
        )
        logger.info("Recipe DB: upserted %d records", len(recipe_docs))

    logger.info("Vector index build complete.")


def index_ready() -> bool:
    """Return True if the article index exists and is non-empty."""
    try:
        a_db, _ = get_dbs()
        return a_db._collection.count() > 0
    except Exception:
        return False


if __name__ == "__main__":
    logging.basicConfig(level="INFO")
    build_index(reset=True)
    print("Index build complete.")
