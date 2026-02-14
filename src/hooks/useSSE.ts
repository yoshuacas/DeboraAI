'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * SSE Message from server
 */
export interface SSEMessage {
  type: 'connected' | 'progress' | 'status' | 'file_change' | 'test_result' | 'error' | 'complete' | 'heartbeat';
  data: any;
  timestamp: number;
}

/**
 * SSE Hook Options
 */
export interface UseSSEOptions {
  sessionId?: string;
  onMessage?: (message: SSEMessage) => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

/**
 * useSSE Hook
 *
 * React hook for consuming Server-Sent Events.
 * Automatically handles connection, reconnection, and cleanup.
 *
 * Usage:
 * ```typescript
 * const { messages, isConnected } = useSSE({
 *   sessionId: 'abc123',
 *   onMessage: (msg) => console.log(msg),
 * });
 * ```
 */
export function useSSE(options: UseSSEOptions = {}) {
  const {
    sessionId,
    onMessage,
    onError,
    autoConnect = true,
  } = options;

  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    // Don't connect if already connected
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    // Build URL with optional sessionId
    const url = sessionId
      ? `/api/sse?sessionId=${encodeURIComponent(sessionId)}`
      : '/api/sse';

    console.log('[SSE] Connecting to:', url, 'with sessionId:', sessionId);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const message: SSEMessage = JSON.parse(event.data);

          console.log('[SSE] Received message:', message.type, message);

          // Skip heartbeat messages
          if (message.type === 'heartbeat') {
            return;
          }

          // Add to messages array
          setMessages((prev) => [...prev, message]);

          // Call custom handler
          onMessage?.(message);
        } catch (err) {
          console.error('[SSE] Failed to parse message:', err);
        }
      };

      eventSource.onerror = (event) => {
        console.error('[SSE] Error:', event);
        setIsConnected(false);
        setError('Connection error');
        onError?.(event);

        // Close the connection
        eventSource.close();
        eventSourceRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('[SSE] Max reconnect attempts reached');
          setError('Connection failed after multiple attempts');
        }
      };
    } catch (err) {
      console.error('[SSE] Failed to create EventSource:', err);
      setError('Failed to connect');
    }
  }, [sessionId, onMessage, onError]);

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Auto-connect on mount if enabled
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    messages,
    isConnected,
    error,
    connect,
    disconnect,
    clearMessages,
  };
}
