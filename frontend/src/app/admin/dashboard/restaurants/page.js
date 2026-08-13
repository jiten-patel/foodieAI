'use client'
import { useEffect, useState } from "react";
import { useRestaurantData } from "@/hooks/useRestaurants"

const inputClass = "w-full px-4 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark placeholder-primary/50 focus:outline-none focus:border-primary";
const buttonClass = "bg-button-primary text-secondary px-5 py-2 border rounded-xl border-button-primary hover:bg-secondary hover:text-button-primary disabled:opacity-50";
const th = "border p-3 text-left text-sm font-bold text-primary-dark whitespace-nowrap";
const td = "border p-3 text-sm align-top";

const PAGE_SIZE = 20;

// The API sends signatures as a Postgres array literal string ({"a","b"}),
// not a JSON array, because restaurants.signatures is a Text column holding a
// list. Accept either shape.
// ponytail: naive comma split — a signature containing a comma renders as two.
function formatList(value) {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value !== 'string') return '';
    return value
        .replace(/^[{[]|[\]}]$/g, '')
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
        .join(', ');
}

export default function Restaurants() {
    const {
        restaurants,
        isLoading,
        error,
        getRestaurantsData,
        addRestaurant,
        editRestaurant,
        removeRestaurant,
    } = useRestaurantData();

    const [newParagraph, setNewParagraph] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(/** @type {number|null} */(null));
    const [editParagraph, setEditParagraph] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        getRestaurantsData();
    }, [getRestaurantsData]);

    const pageCount = Math.max(1, Math.ceil(restaurants.length / PAGE_SIZE));
    // Clamp instead of storing a possibly-stale page number — e.g. after a
    // delete shrinks the list past the current page.
    const currentPage = Math.min(page, pageCount);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageRestaurants = restaurants.slice(pageStart, pageStart + PAGE_SIZE);

    async function handleAdd(e) {
        e.preventDefault();
        setIsAdding(true);
        const ok = await addRestaurant(newParagraph.trim());
        setIsAdding(false);
        if (ok) setNewParagraph('');
    }

    function startEdit(restaurant) {
        setEditingId(restaurant.itemId);
        setEditParagraph('');
    }

    async function handleSaveEdit(itemId) {
        setIsSaving(true);
        const ok = await editRestaurant(itemId, editParagraph.trim());
        setIsSaving(false);
        if (ok) setEditingId(null);
    }

    async function handleDelete(itemId, name) {
        if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
        await removeRestaurant(itemId);
    }

    return (
        <div className="text-primary">
            <h2 className="font-bold text-4xl text-primary-dark mb-6">Restaurants</h2>

            <form onSubmit={handleAdd} className="mb-8 p-4 border border-primary/10 rounded-2xl bg-secondary max-w-2xl">
                <label htmlFor="new-restaurant" className="block text-sm font-medium text-primary-dark mb-2">
                    Add a restaurant — describe it in a free-text paragraph
                </label>
                <textarea
                    id="new-restaurant"
                    required
                    minLength={10}
                    rows={3}
                    placeholder="e.g. Down in Santa Monica, Mar de Cortez is a sun-drenched casual taqueria specializing in Baja-style seafood. Rating 4.2/5, price range $$..."
                    value={newParagraph}
                    onChange={(e) => setNewParagraph(e.target.value)}
                    className={`${inputClass} mb-3`}
                />
                <button type="submit" disabled={isAdding} className={buttonClass}>
                    {isAdding ? 'Adding…' : 'Add restaurant'}
                </button>
            </form>

            {error && (
                <p className="mb-4 text-sm text-red-600">{error}</p>
            )}

            <div className="w-full overflow-x-auto">
                <table className="border-collapse w-full">
                    <thead>
                        <tr>
                            <th className={th}>Name</th>
                            <th className={th}>Location</th>
                            <th className={th}>Type</th>
                            <th className={th}>Food Style</th>
                            <th className={th}>Rating</th>
                            <th className={th}>Price</th>
                            <th className={th}>Signatures</th>
                            <th className={th}>Vibe</th>
                            <th className={th}>Environment</th>
                            <th className={th}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && restaurants.length === 0 && (
                            <tr>
                                <td className={td} colSpan={10}>Loading…</td>
                            </tr>
                        )}
                        {!isLoading && restaurants.length === 0 && (
                            <tr>
                                <td className={td} colSpan={10}>No restaurants yet.</td>
                            </tr>
                        )}
                        {pageRestaurants.map((r) => (
                            <tr key={r.itemId}>
                                <td className={td}>{r.name}</td>
                                <td className={td}>{r.location}</td>
                                <td className={td}>{r.type}</td>
                                <td className={td}>{r.food_style}</td>
                                <td className={td}>{r.rating ?? '—'}</td>
                                <td className={td}>{r.price_range ? '$'.repeat(r.price_range) : '—'}</td>
                                <td className={td}>{formatList(r.signatures) || '—'}</td>
                                <td className={td}>{r.vibe ?? '—'}</td>
                                <td className={td}>{r.environment ?? '—'}</td>
                                <td className={td}>
                                    {editingId === r.itemId ? (
                                        <div className="flex flex-col gap-2 min-w-64">
                                            <textarea
                                                required
                                                minLength={10}
                                                rows={3}
                                                placeholder="New description to replace this restaurant's details…"
                                                value={editParagraph}
                                                onChange={(e) => setEditParagraph(e.target.value)}
                                                className={inputClass}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isSaving || editParagraph.trim().length < 10}
                                                    onClick={() => handleSaveEdit(r.itemId)}
                                                    className={buttonClass}
                                                >
                                                    {isSaving ? 'Saving…' : 'Save'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId(null)}
                                                    className="px-4 py-2 rounded-xl border border-primary/20 text-primary-dark hover:bg-primary/5"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => startEdit(r)}
                                                className="px-3 py-1.5 rounded-lg border border-primary/20 text-primary-dark hover:bg-primary/5 text-sm"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(r.itemId, r.name)}
                                                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {restaurants.length > 0 && (
                <div className="flex items-center justify-between mt-4 text-sm text-primary-dark">
                    <span>
                        Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, restaurants.length)} of {restaurants.length}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5 disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <span>Page {currentPage} of {pageCount}</span>
                        <button
                            type="button"
                            disabled={currentPage >= pageCount}
                            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                            className="px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/5 disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
