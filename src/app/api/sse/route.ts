import { NextRequest } from 'next/server';
import { sseManager } from '@/lib/sse/broadcast';

/**
 * GET /api/sse
 *
 * Server-Sent Events endpoint for real-time updates.
 * Clients connect to this endpoint to receive live progress updates
 * during code modifications.
 *
 * Usage:
 * const eventSource = new EventSource('/api/sse?sessionId=abc123');
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log(data);
 * };
 */
export async function GET(request: NextRequest) {
  // Get optional sessionId from query params
  const sessionId = request.nextUrl.searchParams.get('sessionId') || undefined;

  console.log('[SSE Endpoint] New connection with sessionId:', sessionId);

  // Create a ReadableStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Generate unique client ID
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('[SSE Endpoint] Registering client:', clientId, 'with sessionId:', sessionId);

      // Register this client with the broadcast manager
      sseManager.registerClient({
        id: clientId,
        controller,
        sessionId,
      });

      // Send initial connection message
      const encoder = new TextEncoder();
      const initialMessage = JSON.stringify({
        type: 'connected',
        data: { clientId, sessionId },
        timestamp: Date.now(),
      });
      controller.enqueue(encoder.encode(`data: ${initialMessage}\n\n`));

      // Keep connection alive with periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = JSON.stringify({
            type: 'heartbeat',
            data: { time: Date.now() },
            timestamp: Date.now(),
          });
          controller.enqueue(encoder.encode(`data: ${heartbeat}\n\n`));
        } catch (error) {
          // Client disconnected
          clearInterval(heartbeatInterval);
          sseManager.unregisterClient(clientId);
        }
      }, 30000); // Every 30 seconds

      // Clean up when connection closes
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        sseManager.unregisterClient(clientId);
        try {
          controller.close();
        } catch (e) {
          // Controller already closed
        }
      });
    },
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
