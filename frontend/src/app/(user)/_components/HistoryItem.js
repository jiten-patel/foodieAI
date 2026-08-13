'use client';

import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';
import { useChatContext } from './ChatProvider';

const BASE_CLASS =
    'w-full flex items-center gap-2 rounded-lg text-sm py-2 px-2 text-left transition-colors group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-0';

export default function HistoryItem({ id, label }) {
    const { loadSession, sessionId } = useChatContext();
    // sessionId is a string after sendMessage (backend replies with str(session.id))
    // but a number here (straight off the /api/sessions JSON) — normalize to compare.
    const isActive = String(sessionId) === String(id);

    return (
        <button
            onClick={() => loadSession(id)}
            title={label}
            className={`${BASE_CLASS} ${isActive ? 'bg-secondary text-button-primary' : 'hover:bg-secondary hover:text-button-primary'}`}
        >
            <ChatBubbleLeftIcon className="w-4 h-4 shrink-0" />
            <span className="truncate group-data-[collapsed=true]:hidden">{label}</span>
        </button>
    );
}
