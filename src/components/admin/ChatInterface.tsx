'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * Message in the conversation
 */
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  modifications?: Array<{ filePath: string; created: boolean }>;
  commit?: { hash: string | null; message: string | null };
  tests?: { passed: number; failed: number; total: number; skipped?: boolean };
  duration?: number;
  error?: string;
}

/**
 * ChatInterface Component
 *
 * Main UI for admins to interact with the AI coding agent.
 * Allows natural language requests to modify the staging codebase.
 */
export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Send message to AI agent
   */
  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map((msg) => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      }));

      // Call the AI agent API
      const response = await fetch('/api/code/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory,
          sessionId,
          skipTests: true, // Temporarily skip tests while debugging test runner
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Success response
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.data.result || 'Changes applied successfully',
          timestamp: new Date(),
          modifications: data.data.modifications,
          commit: data.data.commit,
          tests: data.data.tests,
          duration: data.data.duration,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update session ID for conversation continuity
        if (data.data.sessionId) {
          setSessionId(data.data.sessionId);
        }
      } else {
        // Error response
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: `Error: ${data.error}`,
          timestamp: new Date(),
          error: data.error,
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: `Failed to communicate with AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        error: String(error),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Enter key to send message
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Clear conversation
   */
  const handleClearConversation = () => {
    setMessages([]);
    setSessionId(undefined);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900">AI Coding Agent</h2>
          <p className="text-sm text-gray-600">
            Modifying: <span className="font-mono text-blue-600">staging</span>
          </p>
        </div>
        <button
          onClick={handleClearConversation}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium">Welcome to DeboraAI</p>
            <p className="mt-2">
              Ask me to modify the staging codebase using natural language.
            </p>
            <div className="mt-4 text-sm text-left max-w-md mx-auto space-y-2">
              <p className="font-medium">Example requests:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>"Add a dark mode toggle to the header"</li>
                <li>"Create a Task management feature with database and UI"</li>
                <li>"Add error handling to the login form"</li>
                <li>"Update the homepage with a hero section"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                  ? 'bg-red-50 text-red-900 border border-red-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {/* Message content */}
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* File modifications */}
              {message.modifications && message.modifications.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-sm font-medium mb-2">Files modified:</p>
                  <ul className="text-sm space-y-1">
                    {message.modifications.map((mod, idx) => (
                      <li key={idx} className="font-mono">
                        <span className={mod.created ? 'text-green-600' : 'text-blue-600'}>
                          {mod.created ? '+ ' : '• '}
                        </span>
                        {mod.filePath}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Git commit */}
              {message.commit && message.commit.hash && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-sm">
                    <span className="font-medium">Commit:</span>{' '}
                    <span className="font-mono text-xs">{message.commit.hash.substring(0, 7)}</span>
                  </p>
                </div>
              )}

              {/* Test results */}
              {message.tests && !message.tests.skipped && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-sm">
                    <span className="font-medium">Tests:</span>{' '}
                    <span
                      className={
                        message.tests.failed === 0 ? 'text-green-600' : 'text-red-600'
                      }
                    >
                      {message.tests.passed}/{message.tests.total} passed
                    </span>
                  </p>
                </div>
              )}

              {/* Duration */}
              {message.duration && (
                <div className="mt-2 text-xs opacity-70">
                  {(message.duration / 1000).toFixed(1)}s
                </div>
              )}

              {/* Timestamp */}
              <div className="mt-2 text-xs opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                <span className="text-gray-600">AI agent is working...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe the changes you want to make..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`px-6 py-3 rounded-lg font-medium ${
              !input.trim() || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Send
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
