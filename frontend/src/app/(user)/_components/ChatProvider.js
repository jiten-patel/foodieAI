'use client';

import { createContext, useContext } from 'react';
import { useRecommendation } from '@/hooks/useChat';

const ChatContext = createContext(null);

export default function ChatProvider({ children }) {
    const chat = useRecommendation();
    return <ChatContext value={chat}>{children}</ChatContext>;
}

export function useChatContext() {
    const ctx = useContext(ChatContext);
    if (!ctx) throw new Error('useChatContext must be used within ChatProvider');
    return ctx;
}
