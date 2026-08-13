import { useCallback, useState } from 'react';
import { getAdminStats } from "@/lib/api"

export function useAdminStatsData() {
    const [stats, setStats] = useState(/** @type {{user_count:number, session_count:number, index_ready:boolean}|null} */(null));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(/** @type {string|null} */(null));

    const getStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getAdminStats();
            setStats(res);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { stats, isLoading, error, getStats };
}
