import { useCallback, useState } from 'react';
import { getUsers } from "@/lib/api"

export function useUserData() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(/** @type {string|null} */(null));
    const [users, setUsers] = useState([]);

    const getUsersData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getUsers();
            setUsers(res ?? []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        users,
        isLoading,
        error,
        getUsersData,
    };
}
