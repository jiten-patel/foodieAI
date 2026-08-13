'use client'
import { useEffect, useState } from "react";
import { useRecipeData } from "@/hooks/useRecipes"

const inputClass = "w-full px-4 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark placeholder-primary/50 focus:outline-none focus:border-primary";
const buttonClass = "bg-button-primary text-secondary px-5 py-2 border rounded-xl border-button-primary hover:bg-secondary hover:text-button-primary disabled:opacity-50";
const th = "border p-3 text-left text-sm font-bold text-primary-dark whitespace-nowrap";
const td = "border p-3 text-sm align-top";

const PAGE_SIZE = 20;

export default function Recipes() {
    const {
        recipes,
        isLoading,
        error,
        getRecipesData,
        addRecipe,
        editRecipe,
        removeRecipe,
    } = useRecipeData();

    const [newParagraph, setNewParagraph] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState(/** @type {number|null} */(null));
    const [editParagraph, setEditParagraph] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [page, setPage] = useState(1);

    useEffect(() => {
        getRecipesData();
    }, [getRecipesData]);

    const pageCount = Math.max(1, Math.ceil(recipes.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageRecipes = recipes.slice(pageStart, pageStart + PAGE_SIZE);

    async function handleAdd(e) {
        e.preventDefault();
        setIsAdding(true);
        const ok = await addRecipe(newParagraph.trim());
        setIsAdding(false);
        if (ok) setNewParagraph('');
    }

    function startEdit(recipe) {
        setEditingId(recipe.id);
        setEditParagraph('');
    }

    async function handleSaveEdit(recipeId) {
        setIsSaving(true);
        const ok = await editRecipe(recipeId, editParagraph.trim());
        setIsSaving(false);
        if (ok) setEditingId(null);
    }

    async function handleDelete(recipeId, name) {
        if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
        await removeRecipe(recipeId);
    }

    return (
        <div className="text-primary">
            <h2 className="font-bold text-4xl text-primary-dark mb-6">Recipes</h2>

            <form onSubmit={handleAdd} className="mb-8 p-4 border border-primary/10 rounded-2xl bg-secondary max-w-2xl">
                <label htmlFor="new-recipe" className="block text-sm font-medium text-primary-dark mb-2">
                    Add a recipe — describe it in a free-text paragraph
                </label>
                <textarea
                    id="new-recipe"
                    required
                    minLength={10}
                    rows={3}
                    placeholder="e.g. A quick Margherita pizza: knead a 260g dough ball, spread tomato sauce, top with mozzarella and basil, bake at 250°C. Serves 2, prep 20 mins, cook 15 mins..."
                    value={newParagraph}
                    onChange={(e) => setNewParagraph(e.target.value)}
                    className={`${inputClass} mb-3`}
                />
                <button type="submit" disabled={isAdding} className={buttonClass}>
                    {isAdding ? 'Adding…' : 'Add recipe'}
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
                            <th className={th}>Cuisine</th>
                            <th className={th}>Servings</th>
                            <th className={th}>Prep</th>
                            <th className={th}>Cook</th>
                            <th className={th}>Total</th>
                            <th className={th}>Ingredients</th>
                            <th className={th}>Directions</th>
                            <th className={th}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && recipes.length === 0 && (
                            <tr>
                                <td className={td} colSpan={9}>Loading…</td>
                            </tr>
                        )}
                        {!isLoading && recipes.length === 0 && (
                            <tr>
                                <td className={td} colSpan={9}>No recipes yet.</td>
                            </tr>
                        )}
                        {pageRecipes.map((r) => (
                            <tr key={r.id}>
                                <td className={td}>{r.name}</td>
                                <td className={td}>{r.cuisine}</td>
                                <td className={td}>{r.servings ?? '—'}</td>
                                <td className={td}>{r.prep_time ?? '—'}</td>
                                <td className={td}>{r.cook_time ?? '—'}</td>
                                <td className={td}>{r.total_time ?? '—'}</td>
                                <td className={td}>{(r.ingredients ?? []).join(', ') || '—'}</td>
                                <td className={td}>{(r.directions ?? []).join(' ') || '—'}</td>
                                <td className={td}>
                                    {editingId === r.id ? (
                                        <div className="flex flex-col gap-2 min-w-64">
                                            <textarea
                                                required
                                                minLength={10}
                                                rows={3}
                                                placeholder="New description to replace this recipe's details…"
                                                value={editParagraph}
                                                onChange={(e) => setEditParagraph(e.target.value)}
                                                className={inputClass}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isSaving || editParagraph.trim().length < 10}
                                                    onClick={() => handleSaveEdit(r.id)}
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
                                                onClick={() => handleDelete(r.id, r.name)}
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

            {recipes.length > 0 && (
                <div className="flex items-center justify-between mt-4 text-sm text-primary-dark">
                    <span>
                        Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, recipes.length)} of {recipes.length}
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
