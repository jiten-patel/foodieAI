import { useCallback, useState } from 'react';
import { getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant } from "@/lib/api"

export function useRestaurantData() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(/** @type {string|null} */(null));
    const [restaurants, setRestaurants] = useState([]);

    // No deps that this function itself changes (isLoading), so its identity
    // stays stable — safe to put in a useEffect dep array without refetch loops.
    const getRestaurantsData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getRestaurants();
            setRestaurants(res.data ?? []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addRestaurant = useCallback(async (paragraph) => {
        setError(null);
        try {
            await createRestaurant(paragraph);
            await getRestaurantsData();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [getRestaurantsData]);

    const editRestaurant = useCallback(async (itemId, paragraph) => {
        setError(null);
        try {
            await updateRestaurant(itemId, paragraph);
            await getRestaurantsData();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [getRestaurantsData]);

    const removeRestaurant = useCallback(async (itemId) => {
        setError(null);
        try {
            await deleteRestaurant(itemId);
            setRestaurants((prev) => prev.filter((r) => r.itemId !== itemId));
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, []);

    return {
        restaurants,
        isLoading,
        error,
        getRestaurantsData,
        addRestaurant,
        editRestaurant,
        removeRestaurant,
    };
}
