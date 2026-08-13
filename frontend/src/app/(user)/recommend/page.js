'use client'
import { useState } from "react";
import { useRecommend } from "@/hooks/useRecommend";
import RecommendationResults from "../_components/RecommendationResults";

export default function RecommendPage() {
    const [userInput, setUserInput] = useState('');
    const [type, setType] = useState('both');
    const { result, isLoading, error, submit } = useRecommend();

    function handleSubmit(e) {
        e.preventDefault();
        if (!userInput.trim()) return;
        submit(userInput.trim(), type);
    }

    const hasResults = result && ((result.restaurants?.length ?? 0) > 0 || (result.recipes?.length ?? 0) > 0);

    return (
        <div className="flex-1 flex justify-center px-4 py-10">
            <div className="w-full max-w-2xl">
                <h1 className="text-3xl font-bold text-primary-dark mb-2">Get a recommendation</h1>
                <p className="text-sm text-primary/70 mb-6">
                    Describe what you're in the mood for — cuisine, vibe, budget, occasion — and get a structured top-5.
                </p>

                <form onSubmit={handleSubmit} className="mb-8 p-4 border border-primary/10 rounded-2xl bg-secondary">
                    <textarea
                        required
                        minLength={3}
                        rows={3}
                        placeholder="e.g. Spicy Asian food near downtown for a date night, budget-friendly..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark placeholder-primary/50 focus:outline-none focus:border-primary mb-3"
                    />
                    <div className="flex items-center gap-3">
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="px-3 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark"
                        >
                            <option value="both">Restaurants &amp; recipes</option>
                            <option value="restaurant">Restaurants only</option>
                            <option value="recipe">Recipes only</option>
                        </select>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-button-primary text-secondary px-5 py-2 border rounded-xl border-button-primary hover:bg-secondary hover:text-button-primary disabled:opacity-50"
                        >
                            {isLoading ? 'Thinking…' : 'Get recommendations'}
                        </button>
                    </div>
                </form>

                {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
                {isLoading && (
                    <p className="text-sm text-primary/60">Working on it — this runs a multi-agent pipeline, can take a bit…</p>
                )}

                {result && (
                    <div className="bg-ai-message border border-ai-message rounded-2xl px-4 py-3">
                        {hasResults ? (
                            <RecommendationResults restaurants={result.restaurants} recipes={result.recipes} />
                        ) : (
                            <p className="text-primary p-4">No matches — try describing your preferences differently.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
