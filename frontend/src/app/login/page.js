'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaUtensils } from 'react-icons/fa';
import { loginUser } from '@/lib/authClient';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await loginUser(email, password);
            router.push('/');
            router.refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className='min-h-screen w-full flex items-center justify-center bg-secondary px-4'>
            <div className='w-full max-w-sm p-6 border border-primary/10 rounded-2xl shadow-xl bg-secondary'>
                <div className='flex items-center gap-3 mb-6'>
                    <div className='w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0'>
                        <FaUtensils className='text-secondary' />
                    </div>
                    <h1 className='text-xl font-bold text-primary-dark'>Log in</h1>
                </div>

                <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                    <input
                        type='email'
                        required
                        placeholder='Email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className='w-full px-4 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark placeholder-primary/50 focus:outline-none focus:border-primary'
                    />
                    <input
                        type='password'
                        required
                        placeholder='Password'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className='w-full px-4 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark placeholder-primary/50 focus:outline-none focus:border-primary'
                    />

                    {error && <p className='text-sm text-red-600'>{error}</p>}

                    <button
                        type='submit'
                        disabled={isLoading}
                        className='w-full bg-button-primary text-secondary px-5 py-2 border rounded-2xl border-button-primary hover:bg-secondary hover:text-button-primary disabled:opacity-50'
                    >
                        {isLoading ? 'Logging in…' : 'Login'}
                    </button>
                </form>

                <p className='text-sm text-primary mt-4 text-center'>
                    No account?{' '}
                    <Link href='/register' className='underline hover:text-primary-dark'>
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
