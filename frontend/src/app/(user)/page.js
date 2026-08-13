'use client'
import Image from "next/image";
import { SparklesIcon, TrashIcon } from '@heroicons/react/24/outline';
import { FaUtensils, FaConciergeBell } from 'react-icons/fa';
import ChatInput from "./_components/ChatInput";
import ChatMessage from "./_components/ChatMessage";
import TypingIndicator from "./_components/TypingIndicator";
import { useChatContext } from "./_components/ChatProvider";

const WELCOME_SUGGESTIONS = [
  'I want spicy Asian food near downtown for a date night…',
  'I love bold flavours, vegetarian-friendly..',
  'Budget-conscious, looking for a cozy dinner experience…',
  'Cozy ramen place with rich broth…'
];

function EmptyState({ onSuggestion }) {

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-12 text-center">
      <div className="w-16 h-16 bg-button-primary rounded-2xl flex items-center justify-center mb-6">
        <SparklesIcon className="w-8 h-8 text-secondary" />
      </div>
      <h2 className="text-xl font-bold text-primary-dark mb-2">
        How can I help you today?
      </h2>
      <p className="text-primary text-sm max-w-sm mb-8">
        I can find restaurants, suggest recipes, and recommend what to eat
        based on your taste, budget, and the occasion.
      </p>

      {/* Example queries grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {WELCOME_SUGGESTIONS.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(suggestion)}
            className="text-left p-4 border bg-secondary text-button-primary border-button-primary rounded-xl shadow-md hover:bg-button-primary hover:border-button-primary hover:text-secondary hover:shadow-sm transition-all group"
          >
            <span className="text-sm">
              {suggestion}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home() {

  const { messages, isLoading, isSending, error, sendMessage, stopGeneration, clearHistory } = useChatContext();


  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans bg-secondary">
      <div className="flex-1 min-h-3/5 flex flex-col max-w-7xl mx-auto w-full">
        <div
          className="flex-1 h-3/5 overflow-y-auto px-4 py-6"
        >
          {messages.length === 0 ? (
            <EmptyState onSuggestion={sendMessage} />
          ) : (
            <>
              {/* Clear history button */}
              {messages.length > 0 && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 text-xs text-button-primary hover:text-secondary transition-colors px-2 py-1 rounded-lg hover:bg-button-primary"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Clear conversation
                  </button>
                </div>
              )}


              {/* Message list */}
              {messages.map((msg, i) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isLast={i === messages.length - 1}
                />
              ))}

              {/* Typing indicator while waiting on an AI reply */}
              {isSending && <TypingIndicator />}

              {/* Global error banner */}
              {error && !messages.some((m) => m.metadata?.error) && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
                  <span>⚠️ {error}</span>
                  <button
                    className="text-xs underline ml-4 text-red-600 hover:text-red-800"
                  >
                    Reset
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <ChatInput onSend={sendMessage} isLoading={isLoading} onStop={stopGeneration} isStreaming={isLoading} />
      </div>
    </div>
  );
}
