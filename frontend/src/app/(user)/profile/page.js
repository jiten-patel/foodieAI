'use client'
import { useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useProfileData } from "@/hooks/useProfile";

function TagList({ label, items }) {
    if (!items || items.length === 0) return null;
    return (
        <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary/60 mb-2">{label}</h3>
            <div className="flex flex-wrap gap-2">
                {items.map((item, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-sm bg-primary/10 text-primary-dark">
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const { profile, isLoading, notFound, error, getProfile } = useProfileData();

    useEffect(() => {
        // proxy.js only gates /admin/* — a guest can still land here by URL,
        // so guard client-side rather than firing a doomed fetch.
        if (status === 'authenticated') getProfile();
    }, [status, getProfile]);

    if (status !== 'authenticated') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 text-center">
                <p className="text-primary/70 mb-3">Log in to see your account and food preferences.</p>
                <Link href="/login" className="text-button-primary underline text-sm">
                    Log in
                </Link>
            </div>
        );
    }

    return (
        <div className="flex-1 flex justify-center px-4 py-10">
            <div className="w-full max-w-2xl">
                <h1 className="text-3xl font-bold text-primary-dark mb-6">My Account</h1>

                <div className="flex items-center gap-4 p-5 border border-primary/10 rounded-2xl bg-secondary mb-6">
                    <UserCircleIcon className="w-14 h-14 text-primary shrink-0" />
                    <div>
                        <p className="font-semibold text-primary-dark">{session?.user?.name}</p>
                        <p className="text-sm text-primary/70">{session?.user?.email}</p>
                    </div>
                </div>

                <h2 className="text-xl font-bold text-primary-dark mb-1">Your food preferences</h2>
                <p className="text-sm text-primary/70 mb-6">
                    Built automatically from your chat conversations — nothing to fill in yourself.
                </p>

                {isLoading && (
                    <p className="text-sm text-primary/60">Loading…</p>
                )}

                {!isLoading && notFound && (
                    <div className="p-6 border border-primary/10 rounded-2xl bg-secondary text-center">
                        <p className="text-primary/70 mb-3">
                            No profile yet — chat about a restaurant or recipe you're in the mood for, and one will appear here.
                        </p>
                        <Link href="/" className="text-button-primary underline text-sm">
                            Go to chat
                        </Link>
                    </div>
                )}

                {!isLoading && error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}

                {!isLoading && profile && (
                    <div className="p-6 border border-primary/10 rounded-2xl bg-secondary">
                        {profile.summary && (
                            <p className="text-primary-dark leading-relaxed mb-6">{profile.summary}</p>
                        )}

                        <div className="flex flex-wrap gap-6 mb-4">
                            {profile.price_range && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-primary/60 mb-1">Price range</h3>
                                    <p className="text-primary-dark font-medium">{profile.price_range}</p>
                                </div>
                            )}
                            {profile.adventurousness_score != null && (
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-primary/60 mb-1">Adventurousness</h3>
                                    <p className="text-primary-dark font-medium">{profile.adventurousness_score} / 10</p>
                                </div>
                            )}
                        </div>

                        <TagList label="Favorite cuisines" items={profile.favorite_cuisines} />
                        <TagList label="Dietary restrictions" items={profile.dietary_restrictions} />
                        <TagList label="Dining occasions" items={profile.dining_occasions} />
                        <TagList label="Flavor preferences" items={profile.flavor_preferences} />

                        <p className="text-xs text-primary/50 mt-4">
                            Last updated {new Date(profile.updated_at).toLocaleString()}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
