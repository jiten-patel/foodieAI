'use client'
import { useState, React } from 'react';
import { useRouter } from 'next/navigation';
import { FaUtensils } from 'react-icons/fa';
import { loginUser } from '@/lib/authClient';
import Image from "next/image";

export default function AdminLoginPage() {
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
            const user = await loginUser(email, password);
            if (user.role !== 'admin') {
                setError('This account does not have admin access.');
                return;
            }
            router.push('/admi/dashboard');
            router.refresh();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className='min-h-screen lg:w-1/2 w-full h-full flex items-center justify-center bg-secondary px-4'>
            <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
                <div className="mb-5 sm:mb-8">
                    <h1 className="mb-2 font-semibold text-primary-dark text-4xl sm:text-title-md">
                        Sign In
                    </h1>
                    <p className="text-sm text-primary-dark">
                        Enter your email and password to sign in!
                    </p>
                </div>
                <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-primary-dark" >
                            Email <span className="text-red-500">*</span>{" "}
                        </label>
                        <input
                            id="email"
                            type='email'
                            required
                            placeholder='info@admin.com'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className='w-full px-4 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark placeholder-primary/50 focus:outline-none focus:border-primary'
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-primary-dark">
                            Password <span className="text-red-500">*</span>{" "}
                        </label>
                        <input
                            id="password"
                            type='password'
                            required
                            placeholder='Enter your Password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className='w-full px-4 py-2 rounded-xl border border-primary/20 bg-secondary text-primary-dark placeholder-primary/50 focus:outline-none focus:border-primary'
                        />
                    </div>


                    {error && <p className='text-sm text-red-600'>{error}</p>}

                    <button
                        type='submit'
                        disabled={isLoading}
                        className='w-full bg-button-primary text-secondary px-5 py-2 border rounded-[10px] border-button-primary hover:bg-secondary hover:text-button-primary disabled:opacity-50'
                    >
                        {isLoading ? 'Logging in…' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
