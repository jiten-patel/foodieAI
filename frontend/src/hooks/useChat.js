'use client';

/**
 * useRecommendation — React hook for sending queries to the Resturant Agents.
 *
 * Manages the conversation state (messages, session, loading, error)
 * and calls the Resturant Agents via the Next.js route handler.
 *
 * Usage:
 *   const { messages, sendMessage, isLoading, error, clearHistory } = useChat();
 *
 * 
 */

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { sendChatMessage, sendRecommendMessage, getSessionMessages, UnauthorizedError } from "@/lib/api"

// Shared by the normal guest path and the "session got revoked mid-chat"
// fallback below — same response shape (RecommendationResponse) either way.
function buildGuestAssistantMsg(data) {
    return {
        role: 'assistant',
        content: { restaurants: data.restaurants ?? [], recipes: data.recipes ?? [] },
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        metadata: {
            preferences: data.user_profile ?? {},
        },
    };
}

// Assistant messages are persisted as either a plain reply string or a
// JSON-stringified {restaurants, recipes} — same shape sendMessage() builds
// live, so history and live chat render through the same ChatMessage code.
function parseAssistantContent(raw) {
    try {
        return JSON.parse(raw);
    } catch {
        return { restaurants: [], recipes: [] };
    }
}

export function useRecommendation(opts = {}) {
    const { status } = useSession();
    const isAuthed = status === 'authenticated';
    const router = useRouter();

    const [messages, setMessages] = useState(/** @type {ChatMessage[]} */([]));
    const [isLoading, setIsLoading] = useState(false);
    // Narrower than isLoading — true only while waiting on an AI reply, not
    // while loadSession() is fetching history. Drives the typing indicator.
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(/** @type {string|null} */(null));
    // Only meaningful for logged-in users — /api/recommend is stateless, no session to track.
    const [sessionId, setSessionId] = useState(/** @type {number|null} */(null));
    const abortControllerRef = useRef(/** @type {AbortController|null} */(null));

    const sendMessage = useCallback(
        async (text) => {
            if (!text.trim() || isLoading) return;

            const userMsg = {
                role: 'user',
                content: text.trim(),
                id: crypto.randomUUID(),
                timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, userMsg]);
            setIsLoading(true);
            setIsSending(true);
            setError(null);

            const controller = new AbortController();
            abortControllerRef.current = controller;

            try {
                let assistantMsg;

                if (isAuthed) {
                    // Logged in: /api/chat persists the turn under a session_id
                    // the backend owns — nothing to change there, just keep
                    // sending the same one back so it's a continued conversation.
                    const wasNewSession = sessionId == null;
                    const data = await sendChatMessage(text.trim(), {
                        customerId: opts.customerId,
                        sessionId,
                        signal: controller.signal,
                    });
                    setSessionId(data.data.session_id ?? null);

                    // A brand-new session just got created server-side — refresh
                    // so the Suspense-streamed sidebar history picks it up.
                    if (wasNewSession && data.data.session_id) {
                        router.refresh();
                    }

                    assistantMsg = {
                        role: 'assistant',
                        content: data.data.recommendations ?? { restaurants: [], recipes: [] },
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        metadata: {
                            intent: data.data.intent,
                            preferences: data.data.preferences ?? [],
                        },
                    };
                } else {
                    // Guest: stateless recommend endpoint, no auth, no persistence.
                    const data = await sendRecommendMessage(text.trim(), { signal: controller.signal });
                    assistantMsg = buildGuestAssistantMsg(data);
                }

                setMessages((prev) => [...prev, assistantMsg]);
            } catch (err) {
                if (err.name === 'AbortError') {
                    // User hit Stop — leave their message as-is, no error bubble.
                    // Note: this only stops the client from waiting; the backend
                    // call (and its DB writes) already in flight run to completion.
                } else if (isAuthed && err instanceof UnauthorizedError) {
                    // lib/api.js already tried a silent refresh and it failed too
                    // (and signed the NextAuth session out) — this account is
                    // genuinely logged out now, not just mid-refresh. Don't
                    // dead-end on an error bubble: answer the same message as
                    // a guest instead, same as if they'd never been logged in.
                    try {
                        const data = await sendRecommendMessage(text.trim(), { signal: controller.signal });
                        setSessionId(null);
                        setMessages((prev) => [...prev, buildGuestAssistantMsg(data)]);
                    } catch (fallbackErr) {
                        setError(fallbackErr.message);
                        setMessages((prev) => [
                            ...prev,
                            {
                                role: 'assistant',
                                content: 'Sorry, I encountered an error. Please try again.',
                                id: crypto.randomUUID(),
                                timestamp: Date.now(),
                                metadata: { error: fallbackErr.message },
                            },
                        ]);
                    }
                } else {
                    setError(err.message);
                    // Add an error message to the conversation
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: 'assistant',
                            content: 'Sorry, I encountered an error. Please try again.',
                            id: crypto.randomUUID(),
                            timestamp: Date.now(),
                            metadata: { error: err.message },
                        },
                    ]);
                }
            } finally {
                setIsLoading(false);
                setIsSending(false);
                abortControllerRef.current = null;
            }
        },
        [isLoading, opts.customerId, isAuthed, sessionId, router]
    );

    const stopGeneration = useCallback(() => {
        abortControllerRef.current?.abort();
    }, []);

    const clearHistory = useCallback(() => {
        setMessages([]);
        setError(null);
        setSessionId(null);
    }, []);

    const loadSession = useCallback(
        async (id) => {
            if (isLoading) return;
            setIsLoading(true);
            setError(null);

            try {
                const rawMessages = await getSessionMessages(id);
                setMessages(
                    rawMessages.map((m) => ({
                        role: m.role,
                        content: m.role === 'user' ? m.content : parseAssistantContent(m.content),
                        id: crypto.randomUUID(),
                        timestamp: new Date(m.created_at).getTime(),
                        metadata: m.role === 'assistant' ? { intent: m.intent } : undefined,
                    }))
                );
                setSessionId(id);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading]
    );

    return {
        messages,
        isLoading,
        isSending,
        error,
        sendMessage,
        stopGeneration,
        clearHistory,
        loadSession,
        sessionId,
    };
}