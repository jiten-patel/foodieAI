import { useCallback, useState } from 'react';
import { getIndexStatus, buildIndex } from "@/lib/api"

export function useIndexData() {
    const [isReady, setIsReady] = useState(/** @type {boolean|null} */(null));
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const [isBuilding, setIsBuilding] = useState(false);
    const [error, setError] = useState(/** @type {string|null} */(null));
    const [lastMessage, setLastMessage] = useState(/** @type {string|null} */(null));

    const checkStatus = useCallback(async () => {
        setIsCheckingStatus(true);
        setError(null);
        try {
            const res = await getIndexStatus();
            setIsReady(!!res.data?.ready);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsCheckingStatus(false);
        }
    }, []);

    // Rebuilding embeds every restaurant/recipe one HTTP call at a time
    // (Gemini's embedContent has no batch endpoint) — this can take a while
    // for a few hundred records, so isBuilding is meant to drive a real
    // "this will take a minute" indicator, not a quick spinner.
    const rebuild = useCallback(async () => {
        setIsBuilding(true);
        setError(null);
        setLastMessage(null);
        try {
            const res = await buildIndex(true);
            setLastMessage(res.message ?? 'Index rebuilt');
            await checkStatus();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setIsBuilding(false);
        }
    }, [checkStatus]);

    return {
        isReady,
        isCheckingStatus,
        isBuilding,
        error,
        lastMessage,
        checkStatus,
        rebuild,
    };
}
