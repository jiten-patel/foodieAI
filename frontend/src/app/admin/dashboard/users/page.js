'use client'
import { useEffect, useState } from "react";
import { useUserData } from "@/hooks/useUsers"

const th = "border p-3 text-left text-sm font-bold text-primary-dark whitespace-nowrap";
const td = "border p-3 text-sm align-top";

const PAGE_SIZE = 20;

export default function Users() {
    const { users, isLoading, error, getUsersData } = useUserData();
    const [page, setPage] = useState(1);

    useEffect(() => {
        getUsersData();
    }, [getUsersData]);

    const pageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageStart = (currentPage - 1) * PAGE_SIZE;
    const pageUsers = users.slice(pageStart, pageStart + PAGE_SIZE);

    return (
        <div className="text-primary">
            <h2 className="font-bold text-4xl text-primary-dark mb-6">Users</h2>
            <p className="text-sm text-primary/70 mb-4">
                Read-only — email, role, join date, and session count. No message content is ever shown here.
            </p>

            {error && (
                <p className="mb-4 text-sm text-red-600">{error}</p>
            )}

            <div className="w-full overflow-x-auto">
                <table className="border-collapse w-full">
                    <thead>
                        <tr>
                            <th className={th}>Email</th>
                            <th className={th}>Role</th>
                            <th className={th}>Joined</th>
                            <th className={th}>Sessions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && users.length === 0 && (
                            <tr>
                                <td className={td} colSpan={4}>Loading…</td>
                            </tr>
                        )}
                        {!isLoading && users.length === 0 && (
                            <tr>
                                <td className={td} colSpan={4}>No users yet.</td>
                            </tr>
                        )}
                        {pageUsers.map((u) => (
                            <tr key={u.id}>
                                <td className={td}>{u.email}</td>
                                <td className={td}>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-primary/10 text-primary-dark' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className={td}>{new Date(u.created_at).toLocaleDateString()}</td>
                                <td className={td}>{u.session_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {users.length > 0 && (
                <div className="flex items-center justify-between mt-4 text-sm text-primary-dark">
                    <span>
                        Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, users.length)} of {users.length}
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
