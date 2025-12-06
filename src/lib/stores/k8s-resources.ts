import { browser } from "$app/environment";
import type { KubernetesObject } from "@kubernetes/client-node";
import { derived, writable, type Readable } from "svelte/store";

export type K8sResource = KubernetesObject & {
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    creationTimestamp?: string;
    [key: string]: any;
  };
  spec?: any;
  status?: any;
};

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface ResourceStore {
  resources: Map<string, K8sResource>;
  status: ConnectionStatus;
  error: string | null;
  lastUpdate: Date | null;
}

interface WatcherState {
  eventSource: EventSource | null;
  retryCount: number;
  retryTimeout: number | null;
}

const _watchers = new Map<string, WatcherState>();

/**
 * Create a store for watching Kubernetes resources
 * @param kind - Resource kind, can be short name (e.g. "helmreleases") or full group-version-kind (e.g. "helmreleases.v2beta1.helm.toolkit.fluxcd.io")
 * @param namespace - Optional namespace to watch
 */
export function createK8sResourceStore(
  kind: string,
  namespace?: string
): Readable<ResourceStore> {
  const _watchKey = namespace ? `${kind}:${namespace}` : kind;
  const url = namespace
    ? `/api/watch/${encodeURIComponent(kind)}?namespace=${namespace}`
    : `/api/watch/${encodeURIComponent(kind)}`;

  const { subscribe, set, update } = writable<ResourceStore>({
    resources: new Map(),
    status: "disconnected",
    error: null,
    lastUpdate: null,
  });

  let eventSource: EventSource | null = null;
  let retryCount = 0;
  const maxRetries = 10;
  const baseRetryDelay = 1000;

  function getResourceKey(resource: K8sResource): string {
    return resource.metadata.namespace
      ? `${resource.metadata.namespace}/${resource.metadata.name}`
      : resource.metadata.name;
  }

  function connect() {
    // Only connect in the browser
    if (!browser) {
      return;
    }

    if (eventSource) {
      return;
    }

    update((state) => ({
      ...state,
      status: "connecting",
      error: null,
    }));

    eventSource = new EventSource(url);

    eventSource.addEventListener("connected", (event) => {
      try {
        const _data = JSON.parse(event.data);
        retryCount = 0; // Reset retry count on successful connection

        update((state) => ({
          ...state,
          status: "connected",
          error: null,
        }));
      } catch {
        console.log("Unknown connected event received", event);
      }
    });

    eventSource.addEventListener("info", (event) => {
      const _data = JSON.parse(event.data);
      // Silently handle info messages
    });

    eventSource.addEventListener("resource", (event) => {
      const data = JSON.parse(event.data);
      const { type, resource } = data;

      update((state) => {
        const newResources = new Map(state.resources);

        if (type === "ADDED" || type === "MODIFIED") {
          const key = getResourceKey(resource);
          newResources.set(key, resource);
        } else if (type === "DELETED") {
          const key = getResourceKey(resource);
          newResources.delete(key);
        }

        return {
          ...state,
          resources: newResources,
          lastUpdate: new Date(),
        };
      });
    });

    eventSource.addEventListener("error", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        update((state) => ({
          ...state,
          error: data.error,
        }));
      } catch {
        console.log("Unknown error event received", event);
      }
    });

    eventSource.onerror = (_error) => {
      update((state) => ({
        ...state,
        status: "error",
        error: "Connection lost",
      }));

      // Close and retry
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // Exponential backoff retry
      if (retryCount < maxRetries) {
        const delay = Math.min(baseRetryDelay * 2 ** retryCount, 30000);
        retryCount++;

        setTimeout(() => {
          connect();
        }, delay);
      } else {
        update((state) => ({
          ...state,
          status: "disconnected",
          error: "Connection failed after multiple retries",
        }));
      }
    };
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }

    update((state) => ({
      ...state,
      status: "disconnected",
    }));
  }

  // Auto-connect on first subscription
  let subscriberCount = 0;

  return {
    subscribe: (run: (value: ResourceStore) => void) => {
      subscriberCount++;
      if (subscriberCount === 1) {
        connect();
      }

      const unsubscribe = subscribe(run);

      return () => {
        subscriberCount--;
        unsubscribe();

        if (subscriberCount === 0) {
          disconnect();
        }
      };
    },
  };
}

/**
 * Create derived stores for easy access
 */
export function createResourceArrayStore(
  kind: string,
  namespace?: string
): Readable<K8sResource[]> {
  const store = createK8sResourceStore(kind, namespace);
  return derived(store, ($store) => Array.from($store.resources.values()));
}

export function createResourceStatusStore(
  kind: string,
  namespace?: string
): Readable<{
  status: ConnectionStatus;
  error: string | null;
  count: number;
}> {
  const store = createK8sResourceStore(kind, namespace);
  return derived(store, ($store) => ({
    status: $store.status,
    error: $store.error,
    count: $store.resources.size,
  }));
}
