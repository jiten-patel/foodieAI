# Recommendation pipeline — `/api/chat` and `/api/recommend`

Traced from the actual code as of the retrieval fix (`agents.py`, `retrieval_service.py`, `vector_index.py`). Legend:

- 🟦 API/route layer
- 🟨 LLM call (OpenAI, via `_call_agent` / `classify_intent` / `extract_preferences`)
- 🟩 Real retrieval — no LLM, Chroma vector search
- 🟥 Data store

```mermaid
flowchart TD
    Client([Client]) --> ChatRoute["🟦 POST /api/chat<br/>requires login (get_current_user)"]
    Client --> RecRoute["🟦 POST /api/recommend<br/>no auth, no persistence"]

    ChatRoute --> Session["Resolve session_id<br/>(create or verify ownership)"]
    Session --> SaveUserMsg["conversation_service.add_message<br/>role=user"]
    SaveUserMsg --> Classify["🟨 classify_intent(message)<br/>OpenAI: restaurant / recipe / both /<br/>clarification / database"]

    Classify -->|clarification| CannedA["Canned reply"]
    Classify -->|database| CannedB["Canned reply"]
    Classify -->|restaurant / recipe / both| Extract["🟨 extract_preferences(message)<br/>OpenAI — result returned to client,<br/>NOT fed into the workflow below"]
    Classify -->|other| CannedC["Fallback reply"]

    Extract --> Workflow
    RecRoute --> Workflow

    CannedA --> SaveAsstMsg
    CannedB --> SaveAsstMsg
    CannedC --> SaveAsstMsg

    subgraph Workflow["run_recommendation_workflow (agents.py)"]
        direction TB
        P1["🟨 Phase 1 — node_generate_profile<br/>OpenAI: raw message → user_profile JSON<br/>(favorite_cuisines, dietary_restrictions, summary...)"]
        P2["🟩 Phase 2 — node_retrieve_candidates<br/>NO LLM call — real semantic search"]
        P3a["🟨 Phase 3a — node_analyze_trends (OpenAI)"]
        P3b["🟨 Phase 3b — node_analyze_styles (OpenAI)"]
        P3c["🟨 Phase 3c — node_evaluate_nutrition (OpenAI)"]
        P4["🟨 Phase 4 — node_generate_recommendations<br/>OpenAI: synthesizes everything above<br/>into final_recommendations JSON"]

        P1 --> P2
        P2 -->|"parallel (ThreadPoolExecutor)"| P3a
        P2 --> P3b
        P2 --> P3c
        P3a --> P4
        P3b --> P4
        P3c --> P4
    end

    P2 --> Retrieval

    subgraph Retrieval["retrieval_service.py"]
        direction TB
        RA["🟩 retrieve_articles(query, k=20)<br/>→ retrieved_restaurants"]
        RR["🟩 retrieve_recipes(query, k=20)<br/>→ retrieved_recipes"]
    end

    RA --> EmbedQ["🟩 embed_texts([query])<br/>Gemini gemini-embedding-001<br/>embedContent, 768-dim, no local model"]
    RR --> EmbedQ

    EmbedQ --> ChromaA[("🟥 Chroma: restaurant_articles<br/>211 docs")]
    EmbedQ --> ChromaR[("🟥 Chroma: recipe_articles<br/>109 docs")]

    ChromaA -.->|"built once by<br/>vector_index.build_index()"| PgR[("🟥 Postgres: restaurants")]
    ChromaR -.->|"built once by<br/>vector_index.build_index()"| PgC[("🟥 Postgres: recipes")]

    Workflow --> SaveAsstMsg["conversation_service.add_message<br/>role=assistant"]
    SaveAsstMsg --> Response(["APIResponse<br/>{intent, reply/recommendations, session_id}"])
    RecRoute -.->|no persistence, no session_id| Response
```

## Notes on what's real vs. generated

- **Phase 2 (retrieval) is the only non-LLM step in the workflow** — as of this fix, it does real vector search against your actual Postgres-seeded restaurant/recipe data instead of asking the LLM to invent results.
- **Phases 1, 3a–3c, and 4 are all separate OpenAI calls**, each re-serializing a chunk of state into the prompt. A single `/api/chat` request with a food-related intent costs **7 OpenAI calls total**: `classify_intent`, `extract_preferences`, profile, trends, styles, nutrition, final synthesis.
- **`extract_preferences`'s result is computed and returned to the client but never used by the workflow** — Phase 1 independently re-derives its own profile from the raw message. This is a wasted LLM call, not wired to anything downstream (flagged, not yet fixed).
- **Query embedding uses Gemini** (`gemini-embedding-001`, free tier, 768-dim); **generation (classify/profile/trends/styles/nutrition/recommend) still uses OpenAI** (`gpt-4.1-nano`) — two different providers for two different jobs.
- **`/api/recommend` skips auth and session persistence entirely** — no `session_id`, no message history saved, unlike `/api/chat`.
