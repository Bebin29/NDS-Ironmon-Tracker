import { subscribe, getCurrentState } from "@/lib/state-watcher";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send current state immediately
      const current = getCurrentState();
      if (current) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(current)}\n\n`)
        );
      }

      // Subscribe to changes
      const unsubscribe = subscribe((state) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(state)}\n\n`)
          );
        } catch {
          unsubscribe();
        }
      });

      // Keepalive ping every 15 seconds
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
          unsubscribe();
        }
      }, 15000);

      // Cleanup on close
      const originalCancel = controller.close.bind(controller);
      const cleanup = () => {
        clearInterval(keepalive);
        unsubscribe();
      };

      // Handle client disconnect via abort signal
      if (typeof AbortSignal !== "undefined") {
        // Cleanup will happen when the connection is dropped
        setTimeout(() => {
          // Check periodically if we should clean up
        }, 0);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
