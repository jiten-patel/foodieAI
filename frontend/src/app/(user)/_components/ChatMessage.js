'use client';

/**
 * ChatMessage — renders a single message in the AI shopping chat interface.
 *
 * Handles:
 * - User messages (right-aligned bubble)
 * - Assistant messages with markdown rendering
 * - Inline product cards when products are found
 * - Comparison table rendering
 * - Streaming / typing indicator
 * - Tool call labels
 * - Error states
 *
 * Props
 * -----
 * message   ChatMessage  — { role, content, metadata, isStreaming, toolsCalled }
 * isLast    boolean?
 */

import { memo } from 'react';
import { SparklesIcon, UserIcon } from '@heroicons/react/24/outline';
import TypingIndicator from './TypingIndicator';
import RecommendationResults from './RecommendationResults';

const ChatMessage = memo(function ChatMessage({ message, isLast }) {
    const isUser = message.role === 'user';
    const meta = message.metadata ?? {};

    if (!isUser && message.isStreaming && !message.content) {
        return <TypingIndicator />;
    }

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start  mb-4`}>
            {/* Avatar */}
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-primary-dark text-secondary' : 'bg-button-primary text-secondary'
                }`}>
                {isUser ? (
                    <UserIcon className="w-4 h-4" />
                ) : (
                    <SparklesIcon className="w-4 h-4 text-secondary " />
                )}
            </div>

            {/* Bubble */}
            <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>

                <div className={`rounded-2xl px-4 py-3 ${isUser
                    ? 'bg-user-message text-secondary rounded-tr-sm'
                    : 'bg-ai-message border border-ai-message rounded-tl-sm shadow-sm'
                    }`}>
                    {isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    ) : (
                        <RecommendationResults
                            restaurants={message.content?.restaurants}
                            recipes={message.content?.recipes}
                        />
                    )}
                </div>

                {/* Follow-up question */}
                {!isUser && meta.followUpQuestion && isLast && (
                    <div className="mt-2 text-xs bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-100">
                        ❓ {meta.followUpQuestion}
                    </div>
                )}

                {/* Error */}
                {!isUser && meta.error && (
                    <div className="mt-2 text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg border border-red-100">
                        ⚠️ {meta.error}
                    </div>
                )}

                {/* Timestamp */}
                {message.timestamp && (
                    <span className="text-xs text-button-primary/50 mt-1 px-1">
                        {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </span>
                )}
            </div>
        </div>
    );
});

export default ChatMessage;
