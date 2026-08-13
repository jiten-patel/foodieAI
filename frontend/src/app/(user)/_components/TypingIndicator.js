'use client';

import { SparklesIcon } from '@heroicons/react/24/outline';

/**
 * TypingIndicator — "assistant is composing a reply" row, styled to match
 * an assistant ChatMessage bubble. Drop in wherever a request is pending.
 */
export default function TypingIndicator() {
    return (
        <div className="flex gap-3 flex-row items-start mb-4">
            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-button-primary text-secondary">
                <SparklesIcon className="w-4 h-4 text-secondary" />
            </div>
            <div className="flex flex-col max-w-[85%] items-start">
                <div className="rounded-2xl px-4 py-3 bg-ai-message border border-ai-message rounded-tl-sm shadow-sm">
                    <div className="flex items-center gap-1 py-1">
                        <div className="w-2 h-2 rounded-full bg-button-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-button-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
