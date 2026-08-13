import { useCallback, useState } from 'react';
import { sendRecommendMessage } from "@/lib/api"

export function useRecommend() {
    const [result, setResult] = useState(/** @type {{restaurants:[], recipes:[]}|null} */(null));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(/** @type {string|null} */(null));

    const submit = useCallback(async (userInput, recommendationType) => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const data = await sendRecommendMessage(userInput, { recommendationType });
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { result, isLoading, error, submit };
}
