/**
 * SSE Broadcast Manager
 *
 * Manages Server-Sent Events connections and broadcasts updates to all connected clients.
 * Used for real-time progress updates during code modifications.
 */

export interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
  sessionId?: string; // Optional session filtering
}

export interface SSEMessage {
  type: 'progress' | 'status' | 'file_change' | 'test_result' | 'error' | 'complete';
  data: any;
  sessionId?: string; // Optional session targeting
  timestamp: number;
}

/**
 * Global SSE client registry
 */
class SSEBroadcastManager {
  private clients: Map<string, SSEClient> = new Map();

  /**
   * Register a new SSE client
   */
  registerClient(client: SSEClient): void {
    this.clients.set(client.id, client);
    console.log(`[SSE] Client registered: ${client.id} (Total: ${this.clients.size})`);
  }

  /**
   * Unregister an SSE client
   */
  unregisterClient(clientId: string): void {
    this.clients.delete(clientId);
    console.log(`[SSE] Client unregistered: ${clientId} (Total: ${this.clients.size})`);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: SSEMessage): void {
    const data = JSON.stringify({
      ...message,
      timestamp: message.timestamp || Date.now(),
    });

    console.log(`[SSE Broadcast] Type: ${message.type}, SessionId: ${message.sessionId || 'none'}, Total clients: ${this.clients.size}`);

    let sent = 0;
    for (const [clientId, client] of this.clients.entries()) {
      try {
        // If message has sessionId, only send to matching clients
        if (message.sessionId && client.sessionId !== message.sessionId) {
          console.log(`[SSE] Skipping client ${clientId}: sessionId mismatch (message: ${message.sessionId}, client: ${client.sessionId})`);
          continue;
        }

        const encoder = new TextEncoder();
        client.controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        sent++;
      } catch (error) {
        console.error(`[SSE] Failed to send to client ${clientId}:`, error);
        // Remove dead client
        this.unregisterClient(clientId);
      }
    }

    if (sent > 0) {
      console.log(`[SSE] Broadcast ${message.type} to ${sent} client(s)`);
    } else {
      console.warn(`[SSE] No clients received message type: ${message.type}`);
    }
  }

  /**
   * Send message to specific session
   */
  sendToSession(sessionId: string, message: SSEMessage): void {
    this.broadcast({ ...message, sessionId });
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get all client IDs
   */
  getClientIds(): string[] {
    return Array.from(this.clients.keys());
  }
}

/**
 * Singleton instance
 */
export const sseManager = new SSEBroadcastManager();

/**
 * Helper functions for common message types
 */

export function broadcastProgress(message: string, sessionId?: string): void {
  sseManager.broadcast({
    type: 'progress',
    data: { message },
    sessionId,
    timestamp: Date.now(),
  });
}

export function broadcastStatus(status: string, details?: any, sessionId?: string): void {
  sseManager.broadcast({
    type: 'status',
    data: { status, details },
    sessionId,
    timestamp: Date.now(),
  });
}

export function broadcastFileChange(filePath: string, action: 'created' | 'modified' | 'deleted', sessionId?: string): void {
  sseManager.broadcast({
    type: 'file_change',
    data: { filePath, action },
    sessionId,
    timestamp: Date.now(),
  });
}

export function broadcastTestResult(result: { passed: number; failed: number; total: number }, sessionId?: string): void {
  sseManager.broadcast({
    type: 'test_result',
    data: result,
    sessionId,
    timestamp: Date.now(),
  });
}

export function broadcastError(error: string, sessionId?: string): void {
  sseManager.broadcast({
    type: 'error',
    data: { error },
    sessionId,
    timestamp: Date.now(),
  });
}

export function broadcastComplete(result: any, sessionId?: string): void {
  sseManager.broadcast({
    type: 'complete',
    data: result,
    sessionId,
    timestamp: Date.now(),
  });
}
