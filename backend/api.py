"""
FastAPI application – production-ready REST API for the Food Recommendation system.

Endpoints
─────────
GET    /api/health                          Health check

POST   /api/auth/register                   Create an account
POST   /api/auth/login                      Log in (sets cookies)
POST   /api/auth/refresh                    Refresh the access token
POST   /api/auth/logout                     Clear auth cookies

POST   /api/sessions                        Create a chat session
GET    /api/sessions                        List my chat sessions
GET    /api/sessions/{id}/messages          Get a session's messages
DELETE /api/sessions/{id}                   Delete a session

GET    /api/restaurants                     List all restaurants
GET    /api/restaurants/{item_id}           Get single restaurant
POST   /api/restaurants                     Add restaurant (paragraph)
PUT    /api/restaurants/{item_id}           Update restaurant (paragraph)
DELETE /api/restaurants/{item_id}           Delete restaurant

GET    /api/recipes                         List all recipes (Admin)
GET    /api/recipes/{recipe_id}             Get single recipe (Admin)
POST   /api/recipes                         Add recipe (paragraph, Admin)
PUT    /api/recipes/{recipe_id}             Update recipe (paragraph, Admin)
DELETE /api/recipes/{recipe_id}             Delete recipe (Admin)

POST   /api/search                          Multimodal semantic search
POST   /api/recommend                       Run full multi-agent recommendation
POST   /api/chat                            Conversational chat interface
GET    /api/profile                         My AI-generated preference profile

GET    /api/admin/users                     List users + session counts (Admin)
GET    /api/admin/stats                     User/session counts, index status (Admin)
POST   /api/index/build                     (Admin) Rebuild vector index
GET    /api/index/status                    Check index readiness
"""
from __future__ import annotations

import json
import logging
import threading
import time

import jwt
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from config import get_settings
from models import (
    APIResponse,
    AdminStatsOut,
    AdminUserOut,
    ChatRequest,
    LoginRequest,
    MessageOut,
    RecipeCreate,
    RecipeUpdate,
    RecommendationRequest,
    RecommendationResponse,
    RecommendationItem,
    RegisterRequest,
    RestaurantCreate,
    RestaurantUpdate,
    SearchRequest,
    SearchResponse,
    SearchHit,
    SessionOut,
    UserOut,
    UserProfileOut,
)
from dependencies import get_current_user, require_admin
from database.models.user import User
from database.models.conversation import Conversation
from services import conversation_service, profile_service, recipe_service, restaurant_service, retrieval_service, user_store
from services.agents import (
    classify_intent,
    run_recommendation_workflow,
)
from services.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    decode_token_allow_expired,
    hash_password,
    verify_password,
)
from database.db import get_session_db, init_db
from services.vector_index import build_index, index_ready

# ─── App setup ────────────────────────────────────────────────────────────────

cfg = get_settings()

logging.basicConfig(
    level=cfg.log_level,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI-Powered Multimodal Restaurant Recommendation System",
    description=(
        "A production-ready API combining multi-agent AI orchestration, "
        "multimodal vector search (text + images), and an LLM-powered chat interface."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ─── Rate limiting ──────────────────────────────────────────────────────────────
# In-memory (per-process) limiter — fine for Render's single free-tier instance;
# swap in a Redis storage_uri if this ever runs across multiple instances.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
def _build_index_on_boot():
    """Free-tier hosts wipe local disk between restarts, so rebuild if needed.

    Runs in a detached thread: uvicorn only opens its listening port after this
    startup event returns, and the model download + embedding pass is too slow
    to finish inside Render's port-scan timeout.
    """
    def _run():
        try:
            init_db()
            restaurant_service.seed_if_empty()
        except Exception:
            logger.exception("DB init/seed failed; restaurant endpoints will error until this succeeds")
            return

    threading.Thread(target=_run, daemon=True).start()

# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=cfg.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════════
#  HEALTH
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok", "timestamp": time.time()}


# ═══════════════════════════════════════════════════════════════════════════════
#  AUTH
# ═══════════════════════════════════════════════════════════════════════


def _set_auth_cookies(response: Response, user_id: int, role: str, token_version: int) -> None:
    response.set_cookie(
        "access_token",
        create_access_token(user_id, role, token_version),
        max_age=cfg.access_token_expire_minutes * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        create_refresh_token(user_id, token_version),
        max_age=cfg.refresh_token_expire_days * 86400,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


@app.post("/api/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED, tags=["Auth"])
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_session_db)):
    try:
        user = user_store.create_user(
            db,
            email=payload.email,
            password_hash=hash_password(payload.password),
            name=payload.name,
        )
    except user_store.EmailAlreadyExistsError:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    return user


@app.post("/api/auth/login", response_model=UserOut, tags=["Auth"])
@limiter.limit("5/minute")
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_session_db)):
    user = user_store.get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    _set_auth_cookies(response, user.id, user.role, user.token_version)
    return user


@app.post("/api/auth/refresh", tags=["Auth"])
def refresh(request: Request, response: Response, db: Session = Depends(get_session_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    if payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token type")

    user = user_store.get_user_by_id(db, int(payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    if payload.get("ver") != user.token_version:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session revoked, please log in again")

    # Rotation: bump the version so this refresh token (and any access token
    # still floating around) can't be replayed — only the pair issued below
    # carries the new version.
    user.token_version += 1
    db.commit()

    _set_auth_cookies(response, user.id, user.role, user.token_version)
    return {"message": "refreshed"}


@app.post("/api/auth/logout", tags=["Auth"])
def logout(request: Request, response: Response, db: Session = Depends(get_session_db)):
    # Best-effort revocation: identify the user from whichever cookie is
    # readable (access token is usually expired by the time someone bothers
    # to log out; refresh token is the more reliable one) and bump their
    # token_version so any copy of these tokens elsewhere stops working too.
    for cookie_name in ("refresh_token", "access_token"):
        token = request.cookies.get(cookie_name)
        if not token:
            continue
        payload = decode_token_allow_expired(token)
        if not payload:
            continue
        user = user_store.get_user_by_id(db, int(payload["sub"]))
        if user is not None:
            user.token_version += 1
            db.commit()
        break

    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "logged out"}


# ═══════════════════════════════════════════════════════════════════════════════
#  CHAT SESSIONS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED, tags=["Sessions"])
def create_session(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session_db),
):
    return conversation_service.create_session(db, user.id)


@app.get("/api/sessions", response_model=list[SessionOut], tags=["Sessions"])
def list_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session_db),
):
    return conversation_service.list_sessions_for_user(db, user.id)


@app.get("/api/sessions/{session_id}/messages", response_model=list[MessageOut], tags=["Sessions"])
def get_session_messages(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session_db),
):
    session = conversation_service.get_session_for_user(db, session_id, user.id)
    if session is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return conversation_service.get_messages(db, session_id)


@app.delete("/api/sessions/{session_id}", response_model=APIResponse, tags=["Sessions"])
def delete_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session_db),
):
    deleted = conversation_service.delete_session(db, session_id, user.id)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    return APIResponse(message=f"Session {session_id} deleted")


# ═══════════════════════════════════════════════════════════════════════════════
#  ADMIN
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/admin/users", response_model=list[AdminUserOut], tags=["Admin"])
def list_users_admin(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_session_db),
):
    return user_store.list_users_with_session_counts(db)


@app.get("/api/admin/stats", response_model=AdminStatsOut, tags=["Admin"])
def admin_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_session_db),
):
    return AdminStatsOut(
        user_count=db.query(User).count(),
        session_count=db.query(Conversation).count(),
        index_ready=index_ready(),
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  RESTAURANTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/restaurants", response_model=APIResponse, tags=["Restaurants"])
def list_restaurants(admin: User = Depends(require_admin)):
    data = restaurant_service.get_all_restaurants()
    return APIResponse(data=data, message=f"{len(data)} restaurants found")


@app.get("/api/restaurants/{item_id}", response_model=APIResponse, tags=["Restaurants"])
def get_restaurant(item_id: int, admin: User = Depends(require_admin)):
    restaurant = restaurant_service.get_restaurant_by_id(item_id)
    if restaurant is None:
        raise HTTPException(status_code=404, detail=f"Restaurant {item_id} not found")
    return APIResponse(data=restaurant)


@app.post("/api/restaurants", response_model=APIResponse, status_code=status.HTTP_201_CREATED, tags=["Restaurants"])
def create_restaurant(payload: RestaurantCreate, admin: User = Depends(require_admin)):
    try:
        restaurant = restaurant_service.add_restaurant(payload.paragraph)
        return APIResponse(data=restaurant, message=f"Restaurant '{restaurant.get('name')}' added successfully")
    except Exception as exc:
        logger.exception("Failed to add restaurant")
        raise HTTPException(status_code=422, detail=str(exc))


@app.put("/api/restaurants/{item_id}", response_model=APIResponse, tags=["Restaurants"])
def update_restaurant(item_id: int, payload: RestaurantUpdate, admin: User = Depends(require_admin)):
    try:
        updated = restaurant_service.update_restaurant(item_id, payload.paragraph)
        if updated is None:
            raise HTTPException(status_code=404, detail=f"Restaurant {item_id} not found")
        return APIResponse(data=updated, message="Restaurant updated successfully")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to update restaurant")
        raise HTTPException(status_code=422, detail=str(exc))


@app.delete("/api/restaurants/{item_id}", response_model=APIResponse, tags=["Restaurants"])
def delete_restaurant(item_id: int, admin: User = Depends(require_admin)):
    deleted = restaurant_service.delete_restaurant(item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Restaurant {item_id} not found")
    return APIResponse(message=f"Restaurant {item_id} deleted")


# ═══════════════════════════════════════════════════════════════════════════════
#  RECIPES
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/recipes", response_model=APIResponse, tags=["Recipes"])
def list_recipes(admin: User = Depends(require_admin)):
    data = recipe_service.get_all_recipes()
    return APIResponse(data=data, message=f"{len(data)} recipes found")


@app.get("/api/recipes/{recipe_id}", response_model=APIResponse, tags=["Recipes"])
def get_recipe(recipe_id: int, admin: User = Depends(require_admin)):
    recipe = recipe_service.get_recipe_by_id(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail=f"Recipe {recipe_id} not found")
    return APIResponse(data=recipe)


@app.post("/api/recipes", response_model=APIResponse, status_code=status.HTTP_201_CREATED, tags=["Recipes"])
def create_recipe(payload: RecipeCreate, admin: User = Depends(require_admin)):
    try:
        recipe = recipe_service.add_recipe(payload.paragraph)
        return APIResponse(data=recipe, message=f"Recipe '{recipe.get('name')}' added successfully")
    except Exception as exc:
        logger.exception("Failed to add recipe")
        raise HTTPException(status_code=422, detail=str(exc))


@app.put("/api/recipes/{recipe_id}", response_model=APIResponse, tags=["Recipes"])
def update_recipe(recipe_id: int, payload: RecipeUpdate, admin: User = Depends(require_admin)):
    try:
        updated = recipe_service.update_recipe(recipe_id, payload.paragraph)
        if updated is None:
            raise HTTPException(status_code=404, detail=f"Recipe {recipe_id} not found")
        return APIResponse(data=updated, message="Recipe updated successfully")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to update recipe")
        raise HTTPException(status_code=422, detail=str(exc))


@app.delete("/api/recipes/{recipe_id}", response_model=APIResponse, tags=["Recipes"])
def delete_recipe(recipe_id: int, admin: User = Depends(require_admin)):
    deleted = recipe_service.delete_recipe(recipe_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Recipe {recipe_id} not found")
    return APIResponse(message=f"Recipe {recipe_id} deleted")


# ═══════════════════════════════════════════════════════════════════════════════
#  MULTIMODAL SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/search", response_model=SearchResponse, tags=["Search"])
def semantic_search(payload: SearchRequest):
    if not index_ready():
        raise HTTPException(
            status_code=503,
            detail="Vector index is not ready. Call POST /api/index/build first.",
        )
    where_text = {"location": payload.location_filter} if payload.location_filter else None
    rows = retrieval_service.fuse_rank(
        query=payload.query,
        k_text=payload.k,
        k_img=payload.k,
        w_text=payload.w_text,
        w_img=payload.w_img,
        where_text=where_text,
        top_n=payload.k,
    )
    hits = [
        SearchHit(
            modality=r["modality"],
            id=r["id"],
            cuisine=r.get("cuisine"),
            location=r.get("location"),
            source=r.get("source"),
            fused_score=r["fused_score"],
            snippet=r["snippet"],
        )
        for r in rows
    ]
    return SearchResponse(query=payload.query, hits=hits)


# ═══════════════════════════════════════════════════════════════════════════════
#  MULTI-AGENT RECOMMENDATION
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/recommend", response_model=RecommendationResponse, tags=["Recommendation"])
def recommend(payload: RecommendationRequest):
    try:
        result = run_recommendation_workflow(payload.user_input, payload.recommendation_type)
    except Exception as exc:
        logger.exception("Recommendation workflow failed")
        raise HTTPException(status_code=500, detail=str(exc))

    recs = result.get("final_recommendations", {})

    def _parse_items(raw: list) -> list[RecommendationItem]:
        items = []
        for r in raw:
            if isinstance(r, dict):
                items.append(RecommendationItem(
                    name=r.get("name", ""),
                    reasoning=r.get("reasoning", ""),
                    cuisine=r.get("cuisine"),
                    price=r.get("price"),
                    difficulty=r.get("difficulty"),
                ))
        return items

    want_restaurants = payload.recommendation_type in ("restaurant", "both")
    want_recipes = payload.recommendation_type in ("recipe", "both")

    return RecommendationResponse(
        restaurants=_parse_items(recs.get("restaurants", [])) if want_restaurants else [],
        recipes=_parse_items(recs.get("recipes", [])) if want_recipes else [],
        user_profile=result.get("user_profile", {}),
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  CHAT
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/chat", response_model=APIResponse, tags=["Chat"])
def chat(
    payload: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session_db),
):
    if payload.session_id is not None:
        session = conversation_service.get_session_for_user(db, payload.session_id, user.id)
        if session is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    else:
        session = conversation_service.create_session(db, user.id)

    conversation_service.add_message(db, session.id, role="user", content=payload.message)

    try:
        cfg = get_settings()
        if not cfg.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured — set it in backend/.env")
        
        intent = classify_intent(payload.message)

        if intent == "clarification":
            data = {
                "intent": intent,
                "reply": (
                    "I'm your food recommendation assistant! I can help you with:\n\n"
                    "🍽️ **Restaurant recommendations** – describe your cuisine preferences, "
                    "dietary restrictions, and occasion.\n"
                    "👨‍🍳 **Recipe recommendations** – tell me what you'd like to cook.\n"
                    "🔍 **Semantic search** – find places by vibe, ingredient, or mood.\n\n"
                    "Just describe what you're looking for!"
                ),
            }

        elif intent == "database":
            data = {
                "intent": intent,
                "reply": (
                    "To manage the database, use the **Restaurants** tab in the UI "
                    "or call the REST API endpoints directly."
                ),
            }

        elif intent in ("restaurant", "recipe", "both"):
            result = run_recommendation_workflow(payload.message)
            recs = result.get("final_recommendations", {})
            profile = result.get("user_profile", {})

            if profile:
                try:
                    profile_service.upsert_user_profile(db, user.id, profile)
                except Exception:
                    # The chat reply itself already succeeded — a failure to
                    # save the profile shouldn't turn into a 500 for the user.
                    logger.exception("Failed to save user profile (non-fatal)")
                    db.rollback()

            data = {
                "intent": intent,
                # node_generate_profile already extracts this inside the workflow —
                # calling extract_preferences() here too would be a redundant LLM call.
                "preferences": profile,
                "recommendations": recs,
            }

        else:
            data = {
                "intent": intent,
                "reply": "I'm not sure how to help with that. Can you rephrase?",
            }

    except Exception as exc:
        logger.exception("Chat endpoint error")
        raise HTTPException(status_code=500, detail=str(exc))

    assistant_content = data.get("reply") or json.dumps(data.get("recommendations", {}))
    conversation_service.add_message(db, session.id, role="assistant", content=assistant_content, intent=intent)

    data["session_id"] = str(session.id)
    return APIResponse(data=data)


# ═══════════════════════════════════════════════════════════════════════════════
#  PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/profile", response_model=UserProfileOut, tags=["Profile"])
def get_my_profile(user: User = Depends(get_current_user), db: Session = Depends(get_session_db)):
    profile = profile_service.get_user_profile(db, user.id)
    if profile is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No profile yet — chat about your food preferences first and one will be generated.",
        )
    return profile


# ═══════════════════════════════════════════════════════════════════════════════
#  INDEX MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/index/build", response_model=APIResponse, tags=["Admin"])
def trigger_index_build(reset: bool = True, admin: User = Depends(require_admin)):
    try:
        build_index(reset=reset)
        return APIResponse(message="Vector index built successfully")
    except Exception as exc:
        logger.exception("Index build failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/api/index/status", response_model=APIResponse, tags=["Admin"])
def index_status():
    ready = index_ready()
    return APIResponse(
        data={"ready": ready},
        message="Index is ready" if ready else "Index is not ready — call POST /api/index/build",
    )


