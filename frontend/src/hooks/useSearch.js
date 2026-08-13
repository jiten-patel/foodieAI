import { useCallback, useState } from 'react';
import { searchQuery } from "@/lib/api"

export function useSearch() {
    const [hits, setHits] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(/** @type {string|null} */(null));

    const search = useCallback(async (query, opts) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await searchQuery(query, opts);
            setHits(data.hits ?? []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { hits, isLoading, error, search };
}
