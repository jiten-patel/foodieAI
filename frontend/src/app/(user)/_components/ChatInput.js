'use client';

/**
 * ChatInput — text input + submit button for the AI shopping chat.
 *
 * Features:
 * - Auto-growing textarea
 * - Submit on Enter (Shift+Enter for newline)
 * - Loading / streaming indicator
 * - Stop button to cancel in-flight stream
 * - Suggested prompts chip row
 *
 * Props
 * -----
 * onSend          function(text: string): void
 * onStop          function?(): void  — cancel streaming
 * isLoading       boolean
 * isStreaming      boolean?
 * placeholder      string?
 * suggestedPrompts string[]?
 */

import { useRef, useState, useCallback } from 'react';
import {
    ArrowUpIcon,
    StopIcon,
    SparklesIcon,
} from '@heroicons/react/24/solid';

const DEFAULT_SUGGESTIONS = [
    'I want spicy Asian food near downtown for a date night…',
    'I love bold flavours, vegetarian-friendly..',
    'Budget-conscious, looking for a cozy dinner experience…',
    'Cozy ramen place with rich broth…'
];

export default function ChatInput({
    onSend,
    onStop,
    isLoading = false,
    isStreaming = false,
    placeholder = 'Ask about restaurants, recipes, or get recommendations',
    suggestedPrompts = DEFAULT_SUGGESTIONS,
}) {
    const [value, setValue] = useState('');
    const textareaRef = useRef(null);

    const handleSubmit = useCallback(
        (e) => {
            e?.preventDefault();
            const text = value.trim();
            if (!text || isLoading) return;
            onSend(text);
            setValue('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        },
        [value, isLoading, onSend]
    );

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleInput = (e) => {
        setValue(e.target.value);
        // Auto-grow
        const ta = e.target;
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    };

    const handleSuggestion = (text) => {
        if (isLoading) return;
        onSend(text);
    };

    return (
        <div className="border-t border-primary/50 bg-secondary">
            {/* Suggested prompts */}
            {suggestedPrompts?.length > 0 && (
                <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt, i) => (
                        <button
                            key={i}
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleSuggestion(prompt)}
                            className="text-xs bg-button-primary text-white border border-secondary rounded-full px-3 py-1.5 hover:bg-secondary hover:text-button-primary hover:border-button-primary hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            {/* Input row */}
            <form onSubmit={handleSubmit} className="flex items-center justify-center gap-2 p-3">
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        rows={1}
                        placeholder={placeholder}
                        className="w-full resize-none border border-primary/40 text-body-text-secondary rounded-xl px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-secondary/10 focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                        style={{ minHeight: '48px', maxHeight: '160px' }}
                    />
                </div>

                {/* Send / Stop button */}
                {isStreaming && onStop ? (
                    <button
                        type="button"
                        onClick={onStop}
                        className="shrink-0 w-11 h-11 flex items-center justify-center bg-red-500/40 text-white rounded-xl hover:bg-red-600/40 transition-colors"
                        aria-label="Stop generation"
                    >
                        <StopIcon className="w-4 h-4" />
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={isLoading || !value.trim()}
                        className="shrink-0 w-11 h-11 flex items-center justify-center border-black bg-primary text-secondary rounded-xl hover:bg-secondary hover:text-primary hover:border-black disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        aria-label="Send message"
                    >
                        {isLoading && !isStreaming ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <ArrowUpIcon className="w-4 h-4" />
                        )}
                    </button>
                )}
            </form>

            {/* AI powered label */}
            <div className="px-4 pb-3 flex items-center justify-center gap-1">
                <SparklesIcon className="w-3 h-3 text-primary" />
                <span className="text-xs text-gray-400">FoodieAI — multi-agent food recommendations</span>
            </div>
        </div>
    );
}
