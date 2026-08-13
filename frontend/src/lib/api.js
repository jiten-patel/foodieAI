import { signOut } from 'next-auth/react';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export class UnauthorizedError extends Error {
    constructor(path) {
        super(`Unauthorized: session expired or invalid token (${path})`);
        this.name = 'UnauthorizedError';
        this.status = 401;
    }
}

// Concurrent 401s (e.g. several in-flight requests) should trigger exactly
// one /refresh call, not one each — every caller awaits the same promise.
let refreshInFlight = null;

function tryRefresh() {
    if (!refreshInFlight) {
        refreshInFlight = fetch(`${BASE}/api/backend/auth/refresh`, { method: 'POST' })
            .then((res) => res.ok)
            .catch(() => false)
            .finally(() => {
                refreshInFlight = null;
            });
    }
    return refreshInFlight;
}

async function request(path, options = {}, _isRetry = false) {
    const { headers, ...rest } = options;
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
        ...rest,
    });

    if (!res.ok) {
        // Never chase our own tail on the auth endpoints themselves — a 401
        // from /auth/login is "wrong password", not "session expired".
        const isAuthEndpoint = path.includes('/auth/');

        if (res.status === 401 && !isAuthEndpoint && !_isRetry) {
            const refreshed = await tryRefresh();
            if (refreshed) {
                return request(path, options, true);
            }
            // Refresh token is also dead — this really is a logged-out
            // session. Clear NextAuth's session so the UI (header, useChat's
            // isAuthed branch) stops claiming the user is still logged in;
            // no redirect, since chat still works fine as a guest.
            await signOut({ redirect: false });
        }

        if (res.status === 401) throw new UnauthorizedError(path);
        const text = await res.text();
        throw new Error(`API ${path} → ${res.status}: ${text}`);
    }

    return res.json();
}

export async function sendChatMessage(message, opts = {}) {
    // No `history` here on purpose — the backend already persists the full
    // conversation server-side under session_id (Phase 3), so re-sending it
    // client-side would be redundant. It was also unused by /api/chat and
    // broke on the second turn whenever an earlier assistant reply was a
    // {restaurants, recipes} object instead of a string.
    return request('/api/backend/chat', {
        method: 'POST',
        headers: opts.correlationId
            ? { 'X-Correlation-ID': opts.correlationId }
            : {},
        body: JSON.stringify({
            message,
            customer_id: opts.customerId ?? null,
            session_id: opts.sessionId ?? null,
        }),
        signal: opts.signal,
    });
}

export async function getSessionMessages(sessionId) {
    return request(`/api/backend/sessions/${sessionId}/messages`);
}

// Guest path — no auth, no session_id, no history persisted server-side.
export async function sendRecommendMessage(message, opts = {}) {
    return request('/api/backend/recommend', {
        method: 'POST',
        body: JSON.stringify({
            user_input: message,
            recommendation_type: opts.recommendationType ?? 'both',
        }),
        signal: opts.signal,
    });
}


export async function getRestaurants() {
    return request(`/api/backend/restaurants`);
}

export async function createRestaurant(paragraph) {
    return request(`/api/backend/restaurants`, {
        method: 'POST',
        body: JSON.stringify({ paragraph }),
    });
}

export async function updateRestaurant(itemId, paragraph) {
    return request(`/api/backend/restaurants/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ paragraph }),
    });
}

export async function deleteRestaurant(itemId) {
    return request(`/api/backend/restaurants/${itemId}`, {
        method: 'DELETE',
    });
}

// Returns a plain array (no {data: [...]} envelope, unlike the restaurant/chat routes).
export async function getUsers() {
    return request(`/api/backend/admin/users`);
}

// Also a plain object, no envelope: {user_count, session_count, index_ready}.
export async function getAdminStats() {
    return request(`/api/backend/admin/stats`);
}

export async function getIndexStatus() {
    return request(`/api/backend/index/status`);
}

export async function buildIndex(reset = true) {
    return request(`/api/backend/index/build?reset=${reset}`, {
        method: 'POST',
    });
}

export async function getRecipes() {
    return request(`/api/backend/recipes`);
}

export async function createRecipe(paragraph) {
    return request(`/api/backend/recipes`, {
        method: 'POST',
        body: JSON.stringify({ paragraph }),
    });
}

export async function updateRecipe(recipeId, paragraph) {
    return request(`/api/backend/recipes/${recipeId}`, {
        method: 'PUT',
        body: JSON.stringify({ paragraph }),
    });
}

export async function deleteRecipe(recipeId) {
    return request(`/api/backend/recipes/${recipeId}`, {
        method: 'DELETE',
    });
}

// Plain object, no envelope. 404s until the user has chatted at least once
// with a restaurant/recipe/both intent (that's what generates it).
export async function getMyProfile() {
    return request(`/api/backend/profile`);
}

export async function searchQuery(query, opts = {}) {
    return request(`/api/backend/search`, {
        method: 'POST',
        body: JSON.stringify({
            query,
            k: opts.k ?? 5,
            w_text: opts.wText ?? 0.6,
            w_img: opts.wImg ?? 0.4,
            location_filter: opts.locationFilter || null,
        }),
        signal: opts.signal,
    });
}