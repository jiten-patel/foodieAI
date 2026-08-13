# FoodieAI

**A Multi-Agent LLM System for Personalized Restaurant & Recipe Recommendation**

A full-stack food recommendation app: a **Next.js** frontend, a **FastAPI** backend running a **6-agent LLM pipeline**, **PostgreSQL** for users/sessions/content, and **ChromaDB** for semantic search — with JWT-based auth, a chat interface, and an admin dashboard for content management.

---

## Architecture

```
Next.js (Vercel)                          FastAPI (Render)                    Data stores
 ├─ /              → chat (guest + auth)   ├─ /api/auth/*                     ├─ PostgreSQL
 ├─ /recommend     → structured form  ──→  ├─ /api/sessions/*      ────────→  │   users, conversations, messages,
 ├─ /search        → semantic search       ├─ /api/admin/*                    │   restaurants, recipes, user_review
 ├─ /profile       → AI-derived prefs      ├─ /api/{restaurants,recipes,      └─ ChromaDB (.chroma_db)
 ├─ /admin/*       → admin dashboard       │   search,recommend,chat,profile}     restaurant_articles, recipe_articles
 └─ proxy.js       → gates /admin/* only   └─ /api/index/*  (Admin)
```

- **Auth**: FastAPI issues short-lived JWT access tokens (15 min) + refresh tokens (7 days) as httpOnly cookies — the actual credential for every `/api/*` call. NextAuth (Credentials provider) runs alongside it purely for frontend routing/`useSession()`; login does both in one flow (`frontend/src/lib/authClient.js`). A Next.js rewrite (`/api/backend/:path*` → the Render backend) makes every browser call same-origin, so the cross-domain (Vercel ↔ Render) cookie doesn't get dropped.
- **Roles**: `user` and `admin`. `frontend/src/proxy.js` gates only `/admin/*`; chat/recommend/search are public (guests hit the unauthenticated `/api/recommend`, logged-in users get `/api/chat` with persisted history via `session_id`).
- **Data**: Postgres is the source of truth for users, chat sessions/messages, restaurants, recipes, and reviews (SQLAlchemy ORM + Alembic migrations). ChromaDB holds text embeddings for semantic search over restaurants and recipes only — the CLIP/image pipeline from earlier iterations was dropped to fit Render's free-tier 512MB RAM limit.

---

## Directory layout

```
food-recommendation-chatbot/
├── backend/
│   ├── api.py                      ← FastAPI app, all /api/* routes
│   ├── app.py                      ← local dev entry point (uvicorn wrapper)
│   ├── config.py                   ← pydantic-settings config (reads backend/.env)
│   ├── models.py                   ← Pydantic request/response schemas
│   ├── dependencies.py             ← get_current_user / require_admin
│   ├── mcp_server.py               ← standalone FastMCP server (3 tools + 1 resource)
│   ├── seed_admin.py               ← one-off interactive admin-account seeding script
│   ├── alembic.ini, alembic/       ← DB migrations
│   ├── database/
│   │   ├── db.py                   ← SQLAlchemy engine/session, init_db()
│   │   └── models/                 ← User, Conversation, Message, Restaurant, Recipe, UserReview, UserProfile
│   ├── services/
│   │   ├── agents.py               ← 6-agent recommendation workflow (4 phases)
│   │   ├── auth.py                 ← JWT issue/verify, password hashing
│   │   ├── conversation_service.py ← chat session/message CRUD
│   │   ├── user_store.py           ← user CRUD, admin listing
│   │   ├── profile_service.py      ← AI-derived preference profile storage
│   │   ├── restaurant_service.py   ← restaurant CRUD + LLM paragraph extraction
│   │   ├── recipe_service.py       ← recipe CRUD + LLM paragraph extraction
│   │   ├── llm.py                  ← shared paragraph-extraction-with-retry logic
│   │   ├── retrieval_service.py    ← similarity search + score fusion/ranking
│   │   └── vector_index.py         ← ChromaDB index builder (Gemini embeddings)
│   └── data/                       ← seed JSON datasets
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── (user)/             ← chat `/`, `/recommend`, `/search`, `/profile`
│       │   ├── admin/              ← `/admin/login`, `/admin/dashboard/*`
│       │   ├── login/, register/   ← auth pages
│       │   └── api/auth/[...nextauth]/ ← NextAuth route handler
│       ├── hooks/                  ← useChat, useRecommend, useSearch, useProfile, admin data hooks
│       ├── lib/                    ← api.js (fetch + auto-refresh-on-401), authOptions.js, authClient.js
│       └── proxy.js                ← Next.js 16's middleware-file equivalent, gates /admin/*
│
├── requirements.txt                 ← backend deps (repo root, not backend/)
├── render.yaml                      ← Render deploy config (backend + Postgres)
├── docker-compose.yml                ← local dev stack: Postgres + backend + frontend
├── backend/Dockerfile, frontend/Dockerfile
└── IMPLEMENTATION_PLAN.md            ← build log / phase-by-phase status (gitignored, local only)
```

---

## Quick start

### Option A — Docker (fastest way to see the whole stack)

```bash
docker compose up --build
```

Spins up Postgres, the backend (`:8000`), and the frontend (`:3000`) together. Set `NEXTAUTH_SECRET` in your shell or a root `.env` first — reuse the value from `frontend/.env.local` if you have one.

### Option B — Run backend and frontend natively

**Backend**

```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows
pip install -r ../requirements.txt

# backend/.env — see Environment variables below; minimum: OPENAI_API_KEY, DATABASE_URL, JWT_SECRET_KEY
alembic upgrade head        # create/update tables
python app.py                # or: uvicorn api:app --reload
```

| Endpoint | URL |
|----------|-----|
| REST API | `http://localhost:8000/api/*` |
| Interactive docs | `http://localhost:8000/api/docs` |
| Health check | `http://localhost:8000/api/health` |

**Frontend**

```bash
cd frontend
npm install
# frontend/.env.local — BACKEND_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, see below
npm run dev
```

Open `http://localhost:3000`.

### Build the vector index (enables semantic search + retrieval-backed recommendations)

Via the admin dashboard's **RAG Index** panel, or directly:

```bash
curl -X POST http://localhost:8000/api/index/build \
  -H "Cookie: access_token=<an admin's access token>"
```

---

## Frontend pages

| Route | Access | Description |
|-------|--------|--------------|
| `/` | Public | Chat — guests get one-shot `/api/recommend` replies; logged-in users get `/api/chat` with persisted, continuable history (`session_id`), shown in the sidebar |
| `/recommend` | Public | Structured form (free text + restaurant/recipe/both) → runs the full 6-agent pipeline, shows a top-5 breakdown with reasoning |
| `/search` | Public | Semantic search over restaurants (+ optional location filter), scored/ranked hits |
| `/profile` | Logged in | AI-derived preference profile — cuisines, dietary restrictions, price range, adventurousness score, flavor preferences — built automatically from chat history |
| `/login`, `/register` | Public | Auth pages |
| `/admin/login` | Public | Separate admin login — checks `role === "admin"` after auth, blocks non-admins with an inline error |
| `/admin/dashboard` | Admin | Stat tiles: users, chat sessions, RAG index status |
| `/admin/dashboard/users` | Admin | Read-only user list — email, role, joined date, session *count* only (never message content) |
| `/admin/dashboard/restaurants` | Admin | Full CRUD via free-text paragraph extraction, paginated |
| `/admin/dashboard/recipes` | Admin | Full CRUD via free-text paragraph extraction, paginated |
| `/admin/dashboard/rag-index` | Admin | Index status badge + rebuild trigger |

---

## Multi-agent recommendation workflow

`services/agents.py` runs 6 LLM agents across 4 phases:

```
User Input
   │
   ▼ Phase 1 — sequential
UserProfileAgent ─────────→ Structured profile (cuisines, diet, price range,
   │                         adventurousness score, flavor preferences)
   ▼ Phase 2 — sequential
RAGRetrieverAgent ────────→ Real semantic search over Postgres-backed restaurants
   │                        + recipes via ChromaDB (no LLM call — pure retrieval)
   ├─ Phase 3 — parallel (ThreadPoolExecutor) ─────────────────────────────┐
   │  FoodTrendAgent          FoodStyleAgent          NutritionAgent       │
   │  (emerging trends)       (cuisine/flavor fit)    (dietary compliance) │
   └────────────────────────────────────────────────────────────────────────┘
   │
   ▼ Phase 4 — sequential
RecommendationAgent ──────→ Top-5 restaurants + top-5 recipes, with reasoning
```

`recommendation_type` (`restaurant` / `recipe` / `both`) restricts both retrieval and synthesis to the requested category instead of discarding the unwanted half after the fact.

All agents call OpenAI (`gpt-4.1-nano` by default). Responses are parsed as strict JSON with fallback handling on parse failure.

---

## REST API

| Method | Path | Description |
|--------|------|--------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Log in (sets httpOnly cookies) |
| `POST` | `/api/auth/refresh` | Rotate access/refresh tokens |
| `POST` | `/api/auth/logout` | Clear auth cookies, revoke session |
| `POST` | `/api/sessions` | Create a chat session |
| `GET` | `/api/sessions` | List my chat sessions |
| `GET` | `/api/sessions/{id}/messages` | Get a session's messages |
| `DELETE` | `/api/sessions/{id}` | Delete a session |
| `GET` | `/api/restaurants` | List all restaurants |
| `GET` | `/api/restaurants/{id}` | Get a single restaurant |
| `POST` | `/api/restaurants` | Add restaurant (free-text paragraph, Admin) |
| `PUT` | `/api/restaurants/{id}` | Update restaurant (free-text paragraph, Admin) |
| `DELETE` | `/api/restaurants/{id}` | Delete restaurant (Admin) |
| `GET` | `/api/recipes` | List all recipes (Admin) |
| `GET` | `/api/recipes/{id}` | Get a single recipe (Admin) |
| `POST` | `/api/recipes` | Add recipe (free-text paragraph, Admin) |
| `PUT` | `/api/recipes/{id}` | Update recipe (free-text paragraph, Admin) |
| `DELETE` | `/api/recipes/{id}` | Delete recipe (Admin) |
| `POST` | `/api/search` | Semantic search over restaurants |
| `POST` | `/api/recommend` | Run the full 6-agent recommendation workflow (unauthenticated, powers the guest chat path) |
| `POST` | `/api/chat` | Conversational chat — persists history via `session_id` for logged-in users |
| `GET` | `/api/profile` | My AI-generated preference profile |
| `GET` | `/api/admin/users` | List users + session counts (Admin) |
| `GET` | `/api/admin/stats` | User/session counts, index status (Admin) |
| `POST` | `/api/index/build` | Rebuild the vector index (Admin) |
| `GET` | `/api/index/status` | Check index readiness |

Interactive docs: `http://localhost:8000/api/docs`

### Example: recommend

```bash
curl -X POST http://localhost:8000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"user_input": "I love bold spicy food, vegetarian-friendly, budget-conscious", "recommendation_type": "both"}'
```

### Example: semantic search

```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "cozy ramen with rich broth", "k": 5}'
```

---

## Semantic search / vector index

`services/vector_index.py` embeds restaurant and recipe text into two ChromaDB collections using **Google Gemini's free `gemini-embedding-001`** API (a plain `httpx` REST call — no local model weights, keeps the process inside Render's 512MB free-tier RAM). An earlier CLIP/SentenceTransformers image+text pipeline was dropped for the same memory reason; the image-modality code path in `retrieval_service.py` is still there but always returns zero hits (no image data source configured).

| Collection | Source data |
|------------|--------------|
| `restaurant_articles` | Postgres `restaurants` table |
| `recipe_articles` | Postgres `recipes` table |

---

## LLM-powered restaurant/recipe CRUD

Adding or updating a restaurant or recipe accepts a **free-text paragraph** — no structured JSON required. `services/llm.py` extracts the fields with up to 3 self-healing retries on parse failure, shared by both `restaurant_service.py` and `recipe_service.py`.

**Restaurant fields:** `name`, `location`, `type`, `food_style`, `rating`, `price_range` (1–4), `signatures`, `vibe`, `environment`, `shortcomings`

```bash
curl -X POST http://localhost:8000/api/restaurants \
  -H "Content-Type: application/json" -H "Cookie: access_token=<admin token>" \
  -d '{"paragraph": "Miso Kitchen in Brooklyn is a cozy Japanese izakaya known for house ramen. Rating 4.5/5, price $$."}'
```

---

## MCP server

A standalone FastMCP server, separate from the main API — reads directly from the seed JSON files rather than Postgres:

```bash
python -m backend.mcp_server
```

| Tool | Description |
|------|--------------|
| `get_restaurant_info` | Look up a restaurant by name — cuisine, rating, price, signature dishes |
| `recommend_by_vibe` | Find restaurants by atmosphere keyword (e.g. `"romantic"`, `"moody"`) |
| `get_review` | Retrieve a user review — rating, text, visit date, image description |

| Resource | Description |
|----------|--------------|
| `culinary-map://california` | Full California Culinary Map text — 100+ restaurant descriptions |

---

## Database & migrations

Postgres schema is managed with **Alembic** (`backend/alembic/`). `database/db.py`'s `init_db()` still runs `Base.metadata.create_all()` on every boot as a create-if-missing safety net for a from-scratch database, but real schema changes (`ALTER TABLE`, etc.) go through migrations from here on:

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

---

## Environment variables

**Backend** (`backend/.env`):

| Variable | Default | Description |
|----------|---------|--------------|
| `OPENAI_API_KEY` | *(required)* | Powers the agent pipeline, chat, intent classification |
| `OPENAI_MODEL` | `gpt-4.1-nano` | OpenAI model to use |
| `OPENAI_TEMPERATURE` | `0.7` | Sampling temperature |
| `ANTHROPIC_API_KEY` | `""` | Anthropic key (MCP sampling) |
| `GEMINI_API_KEY` | `""` | Powers vector-index embeddings |
| `DATABASE_URL` | `""` *(required)* | Postgres connection string |
| `JWT_SECRET_KEY` | `""` *(required)* | Signs access/refresh tokens |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `CORS_ORIGINS` | `["http://localhost:3000", "http://localhost:5173"]` | Allowed origins — set to your deployed frontend origin(s) in prod, no `"*"` (invalid alongside credentialed cookies) |
| `CHROMA_PERSIST_DIR` | `.chroma_db` | ChromaDB persistence directory |
| `API_HOST` / `API_PORT` | `localhost` / `8000` | Local dev server bind |
| `API_RELOAD` | `True` | Uvicorn hot-reload (local dev entry point only) |
| `LOG_LEVEL` | `INFO` | Logging level |

**Frontend** (`frontend/.env.local`):

| Variable | Description |
|----------|--------------|
| `BACKEND_URL` | FastAPI origin — used by the `/api/backend/:path*` rewrite and NextAuth's `authorize()` |
| `NEXTAUTH_SECRET` | NextAuth session signing secret |
| `NEXTAUTH_URL` | This app's own origin |

---

## Docker

```bash
docker compose up --build   # Postgres + backend (:8000) + frontend (:3000)
docker compose logs -f
```

`backend/Dockerfile` mirrors Render's native build/run (`pip install` from the repo-root `requirements.txt`, then `uvicorn api:app`). `frontend/Dockerfile` is a multi-stage Next.js `standalone` build. See `docker-compose.yml` for the local-dev wiring (Postgres volume, Chroma volume, inter-container URLs).

---

## Deployment

Split-host, already live:

- **Frontend** — Next.js on **Vercel**, standalone project rooted at `frontend/`.
- **Backend** — FastAPI on **Render**, driven by `render.yaml` (`uvicorn api:app`, free plan, health check at `/api/health`).
- **Database** — Postgres on **Render** (`food-recommendation-db` in `render.yaml`), `DATABASE_URL` wired automatically.

On first deploy after an Alembic change, run `alembic upgrade head` once via Render's dashboard Shell tab.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | Next.js 16 (App Router, route groups), React 19 |
| Frontend auth | NextAuth.js (Credentials provider) + backend httpOnly JWT cookies |
| Styling | Tailwind CSS 4 |
| Backend framework | FastAPI + Uvicorn |
| LLM | OpenAI `gpt-4.1-nano` |
| Agent orchestration | Custom 4-phase pipeline, `ThreadPoolExecutor` for the parallel phase |
| Relational DB | PostgreSQL, SQLAlchemy ORM, Alembic migrations |
| Vector DB | ChromaDB (persisted) via LangChain Chroma |
| Text embeddings | Gemini `gemini-embedding-001` (768-d, via `httpx`) |
| Rate limiting | `slowapi` (in-memory) |
| MCP | FastMCP |
| Config | pydantic-settings |
| Containerization | Docker + docker-compose |
| Hosting | Vercel (frontend) + Render (backend + Postgres) |
