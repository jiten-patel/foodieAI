'use client';

/**
 * Renders restaurant/recipe recommendation cards — the {restaurants, recipes}
 * shape shared by /api/chat's recommendations, /api/recommend's response,
 * and session history replay. Shared by ChatMessage and the Recommend page
 * so this grid only exists in one place.
 */
export default function RecommendationResults({ restaurants = [], recipes = [] }) {
    return (
        <>
            {restaurants.length > 0 && (
                <>
                    <h2 className="text-lg text-secondary font-bold">Restaurant Recommendations</h2>
                    <div className='grid grid-cols-2 gap-3 p-6 items-center justify-between'>
                        {restaurants.map((restaurant, i) => (
                            <div
                                key={i}
                                className="rounded-xl border max-h-75 my-auto border-gray-200 bg-secondary p-6 shadow-sm transition hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-primary-dark">
                                            {restaurant.name}
                                        </h3>
                                        <p className="mt-1 text-sm text-primary">
                                            {restaurant.cuisine}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                                        {restaurant.price}
                                    </span>
                                </div>
                                <p className="mt-4 leading-7 text-primary">
                                    {restaurant.reasoning}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {recipes.length > 0 && (
                <>
                    <h2 className="text-lg text-secondary font-bold">Recipe Recommendations</h2>
                    <div className='grid grid-cols-2 gap-3 p-6 items-center justify-between'>
                        {recipes.map((recipe, i) => (
                            <div
                                key={i}
                                className="rounded-xl border max-h-75 my-auto border-gray-200 bg-secondary p-6 shadow-sm transition hover:shadow-md"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-semibold text-primary-dark">
                                            {recipe.name}
                                        </h3>
                                        <p className="mt-1 text-sm text-primary">
                                            {recipe.cuisine}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                                        {recipe.difficulty}
                                    </span>
                                </div>
                                <p className="mt-4 leading-7 text-primary">
                                    {recipe.reasoning}
                                </p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}
