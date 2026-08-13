import { useCallback, useState } from 'react';
import { getRecipes, createRecipe, updateRecipe, deleteRecipe } from "@/lib/api"

export function useRecipeData() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(/** @type {string|null} */(null));
    const [recipes, setRecipes] = useState([]);

    const getRecipesData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getRecipes();
            setRecipes(res.data ?? []);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const addRecipe = useCallback(async (paragraph) => {
        setError(null);
        try {
            await createRecipe(paragraph);
            await getRecipesData();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [getRecipesData]);

    const editRecipe = useCallback(async (recipeId, paragraph) => {
        setError(null);
        try {
            await updateRecipe(recipeId, paragraph);
            await getRecipesData();
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, [getRecipesData]);

    const removeRecipe = useCallback(async (recipeId) => {
        setError(null);
        try {
            await deleteRecipe(recipeId);
            setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }, []);

    return {
        recipes,
        isLoading,
        error,
        getRecipesData,
        addRecipe,
        editRecipe,
        removeRecipe,
    };
}
