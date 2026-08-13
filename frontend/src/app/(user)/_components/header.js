'use client'
import Link from 'next/link';
import { FaUtensils } from 'react-icons/fa';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
    const { data: session, status } = useSession();

    async function handleLogout() {
        // Clears the backend's real cookies, then NextAuth's own session.
        await fetch('/api/backend/auth/logout', { method: 'POST' });
        await signOut({ callbackUrl: '/login' });
    }

    return (
        <div className='flex flex-row justify-between items-center bg-secondary border-b border-primary/10 px-4 mx-auto w-full'>
            <div className="shrink-0 w-3/4 ">
                <div className="max-w-4xl px-4 py-5 flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
                        <FaUtensils className="text-secondary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-primary-dark">FoodieAI</h1>
                        <p className="text-sm text-primary">Ask me anything — search restaurants, get recipes, or get recommendations</p>
                    </div>
                </div>
            </div>
            <div className='w-1/3 flex flex-row justify-end items-center gap-3'>
                {status == 'authenticated' && session.user.role == 'user' ? (
                    <>
                        <span className='text-sm text-primary truncate max-w-48'>{session.user.email}</span>
                        <button
                            onClick={handleLogout}
                            className='bg-button-primary text-secondary px-5 py-2 border rounded-2xl border-button-primary hover:bg-secondary hover:text-button-primary hover:border-button-primary shrink-0'
                        >
                            Logout
                        </button>
                    </>
                ) : (
                    <Link
                        href='/login'
                        className='bg-button-primary text-secondary px-5 py-2 border rounded-2xl border-button-primary hover:bg-secondary hover:text-button-primary hover:border-button-primary shrink-0'
                    >
                        Login
                    </Link>
                )}
            </div>
        </div>
    )
}
