'use client'
import { useState } from "react";
import { useSearch } from "@/hooks/useSearch";

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const { hits, isLoading, error, search } = useSearch();

    function handleSubmit(e) {
        e.preventDefault();
        if (!query.trim()) return;
        search(query.trim(), { k: 8, locationFilter: locationFilter.trim() });
    }

    return (
        <div className="flex-1 flex justify-center px-4 py-10">
            <div className="w-full max-w-2xl">
                <h1 className="text-3xl font-bold text-primary-dark mb-2">Semantic search</h1>
                <p className="text-sm text-primary/70 mb-6">
                    Search restaurants by vibe, cuisine, or mood — not just exact keyword matches.
                </p>

                <form onSubmit={handleSubmit} className="mb-8 p-4 border border-primary/10 rounded-2xl bg-secondary flex flex-col gap-3">
                    <input
                        required
                        minLength={2}
                        type="text"
                        placeholder="e.g. cozy candlelit spot for a first date"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark placeholder-primary/50 focus:outline-none focus:border-primary"
                    />
                    <input
                        type="text"
                        placeholder="Location filter (optional)"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark placeholder-primary/50 focus:outline-none focus:border-primary"
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="self-start bg-button-primary text-secondary px-5 py-2 border rounded-xl border-button-primary hover:bg-secondary hover:text-button-primary disabled:opacity-50"
                    >
                        {isLoading ? 'Searching…' : 'Search'}
                    </button>
                </form>

                {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

                {!isLoading && !error && hits.length === 0 && (
                    <p className="text-sm text-primary/50">No searches yet.</p>
                )}

                {hits.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {hits.map((hit) => (
                            <div key={`${hit.modality}-${hit.id}`} className="p-4 border border-gray-200 rounded-xl bg-secondary">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs uppercase tracking-wide text-primary/60">{hit.modality}</span>
                                    <span className="text-xs text-primary/50">score {hit.fused_score.toFixed(2)}</span>
                                </div>
                                <p className="text-sm text-primary-dark mb-1">{hit.cuisine} · {hit.location}</p>
                                <p className="text-sm text-primary">{hit.snippet}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
