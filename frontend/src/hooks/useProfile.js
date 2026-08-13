import { useCallback, useState } from 'react';
import { getMyProfile } from "@/lib/api"

export function useProfileData() {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // Distinguishes "no profile generated yet" (expected 404) from a real error.
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState(/** @type {string|null} */(null));

    const getProfile = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setNotFound(false);
        try {
            const res = await getMyProfile();
            setProfile(res);
        } catch (err) {
            if (err.message?.includes('404')) {
                setNotFound(true);
            } else {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { profile, isLoading, notFound, error, getProfile };
}
