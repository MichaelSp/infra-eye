import {
	getInformerManager,
	type ResourceEvent,
} from "$lib/server/k8s-informers";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, url }) => {
  const { kind } = params;
  const namespace = url.searchParams.get("namespace") || undefined;

  console.log(
    `[SSE] Client connecting to watch ${kind}${
      namespace ? ` in ${namespace}` : ""
    }`
  );

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;
      let unsubscribe: (() => void) | null = null;

      // Helper function to send SSE message
      const sendEvent = (data: any, event?: string) => {
        // Check if controller is closed before attempting to enqueue
        if (isClosed) {
          return;
        }

        try {
          const message = `${
            event ? `event: ${event}\n` : ""
          }data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          // If enqueue fails, mark as closed to prevent further attempts
          if (
            err instanceof TypeError &&
            (err as any).code === "ERR_INVALID_STATE"
          ) {
            isClosed = true;
            // Ensure cleanup happens
            if (unsubscribe) {
              unsubscribe();
              unsubscribe = null;
            }
          } else {
            console.error("[SSE] Error sending event to client:", err);
          }
        }
      };

      // Send initial connection message
      sendEvent(
        {
          type: "CONNECTED",
          message: `Watching ${kind}${
            namespace ? ` in namespace ${namespace}` : ""
          }`,
          timestamp: new Date().toISOString(),
        },
        "connected"
      );

      // Subscribe to K8s events
      try {
        const informerManager = getInformerManager();

        // Get current context for debugging
        try {
          const context = informerManager.getCurrentContext();
          sendEvent(
            {
              type: "INFO",
              message: `Connected to cluster context: ${context}`,
              timestamp: new Date().toISOString(),
            },
            "info"
          );
        } catch (err) {
          console.error("[SSE] Failed to get current context:", err);
        }

        unsubscribe = informerManager.subscribe(
          kind,
          (event: ResourceEvent) => {
            // Double-check controller state before processing event
            if (isClosed) {
              return;
            }

            if (event.type === "ERROR") {
              sendEvent(
                {
                  type: "ERROR",
                  error: event.error,
                  timestamp: new Date().toISOString(),
                },
                "error"
              );
            } else {
              sendEvent(
                {
                  type: event.type,
                  resource: event.resource,
                  timestamp: new Date().toISOString(),
                },
                "resource"
              );
            }
          },
          namespace
        );

        // Don't log every subscription to reduce noise
        // console.log(`[SSE] Subscribed to ${kind}${namespace ? `:${namespace}` : ''}`);
      } catch (error) {
        console.error("[SSE] Failed to subscribe to K8s events:", error);
        sendEvent(
          {
            type: "ERROR",
            error:
              error instanceof Error
                ? error.message
                : "Failed to subscribe to K8s events",
            timestamp: new Date().toISOString(),
          },
          "error"
        );

        // Close the stream on subscription error
        controller.close();
        return;
      }

      // Keep-alive interval (send comment every 30 seconds)
      const keepAliveInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(keepAliveInterval);
          return;
        }

        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch (err) {
          // If enqueue fails, mark as closed
          if (
            err instanceof TypeError &&
            (err as any).code === "ERR_INVALID_STATE"
          ) {
            isClosed = true;
            // Don't log keep-alive failures to reduce noise
          } else {
            console.error("[SSE] Error sending keep-alive:", err);
          }
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // Cleanup on stream close or cancel
      return () => {
        // Mark as closed first to prevent any further operations
        isClosed = true;

        // Clear keep-alive
        clearInterval(keepAliveInterval);

        // Unsubscribe from K8s events
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
