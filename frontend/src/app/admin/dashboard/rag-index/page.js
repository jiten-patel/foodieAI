'use client'
import { useEffect } from "react";
import { useIndexData } from "@/hooks/useIndex"

export default function RAGIndex() {
    const { isReady, isCheckingStatus, isBuilding, error, lastMessage, checkStatus, rebuild } = useIndexData();

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    return (
        <div className="text-primary max-w-2xl">
            <h2 className="font-bold text-4xl text-primary-dark mb-6">RAG Index</h2>
            <p className="text-sm text-primary/70 mb-6">
                Rebuilds the semantic-search index from the current restaurants and recipes in Postgres —
                needed after bulk edits, or if search/recommendations start looking stale.
            </p>

            <div className="p-6 border border-primary/10 rounded-2xl bg-secondary">
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-sm font-medium text-primary-dark">Status:</span>
                    {isCheckingStatus && isReady === null ? (
                        <span className="text-sm text-primary/60">Checking…</span>
                    ) : isReady ? (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <span className="w-2 h-2 rounded-full bg-green-500" /> Ready
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <span className="w-2 h-2 rounded-full bg-amber-500" /> Not ready
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    disabled={isBuilding}
                    onClick={rebuild}
                    className="bg-button-primary text-secondary px-5 py-2 border rounded-xl border-button-primary hover:bg-secondary hover:text-button-primary disabled:opacity-50"
                >
                    {isBuilding ? 'Rebuilding… this can take a minute' : 'Rebuild index'}
                </button>

                {lastMessage && !error && (
                    <p className="mt-4 text-sm text-green-700">{lastMessage}</p>
                )}
                {error && (
                    <p className="mt-4 text-sm text-red-600">{error}</p>
                )}
            </div>
        </div>
    )
}
