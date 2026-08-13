import { cookies } from 'next/headers';
import HistoryItem from './HistoryItem';

function formatSessionLabel(updatedAt) {
    return new Date(updatedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default async function HistoryList() {
    const token = (await cookies()).get('access_token')?.value;
    if (!token) return null;

    let sessions;
    try {
        const res = await fetch(`${process.env.BACKEND_URL}/api/sessions`, {
            headers: { Cookie: `access_token=${token}` },
            cache: 'no-store',
        });
        if (!res.ok) return null;
        sessions = await res.json();
    } catch {
        // Backend unreachable — fail quiet, this section isn't critical path.
        return null;
    }
    if (sessions.length === 0) {
        return (
            <p className="px-2 text-sm text-secondary/70 group-data-[collapsed=true]:hidden">
                No conversations yet
            </p>
        );
    }
    return sessions.map((session) => (
        <HistoryItem
            key={session.id}
            id={session.id}
            label={session.title || formatSessionLabel(session.updated_at)}
        />
    ));
}
