import {
  ApisApi,
  KubeConfig,
  Watch,
  type KubernetesObject,
} from "@kubernetes/client-node";
import https from "node:https";

export type ResourceEvent = {
  type: "ADDED" | "MODIFIED" | "DELETED" | "ERROR";
  resource?: KubernetesObject;
  error?: string;
};

export type EventCallback = (event: ResourceEvent) => void;

interface ApiResource {
  name: string;
  singularName: string;
  namespaced: boolean;
  group: string;
  version: string;
  kind: string;
}

class K8sInformerManager {
  private kc: KubeConfig;
  private watchers: Map<
    string,
    { 
      watch: Watch; 
      callbacks: Set<EventCallback>; 
      path: string; 
      resourceVersion?: string;
      resourceCache: Map<string, KubernetesObject>;
    }
  > = new Map();
  private watchAbortControllers: Map<string, AbortController> = new Map();
  private apiResourceCache: Map<string, ApiResource> = new Map();
  private cacheInitialized = false;

  constructor() {
    this.kc = new KubeConfig();
    try {
      // Try loading from default, but handle temporary file issues
      try {
        this.kc.loadFromDefault();
      } catch (err: any) {
        // If it's a temp file issue, try loading from standard locations
        if (err.code === "ENOENT" && err.path?.includes(".switch_tmp")) {
          console.warn(
            "[K8s] Temp kubeconfig not found, trying standard path..."
          );
          this.kc.loadFromFile(`${process.env.HOME}/.kube/config`);
        } else {
          throw err;
        }
      }

      console.log("[K8s] Loaded kubeconfig successfully");

      // Start API discovery immediately in the background
      this.discoverApiResources().catch((err) => {
        console.error(
          "[K8s] Failed to discover API resources during initialization:",
          err
        );
      });
    } catch (error) {
      console.error("[K8s] Failed to load kubeconfig:", error);
      throw error;
    }
  }

  /**
   * Make an HTTPS request to the cluster
   */
  private async makeRequest(path: string): Promise<any> {
    const cluster = this.kc.getCurrentCluster();
    if (!cluster) throw new Error("No cluster configured");

    const opts: any = {};
    this.kc.applyToHTTPSOptions(opts);

    const url = new URL(cluster.server + path);
    const requestOpts: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: "GET",
      ca: opts.ca,
      cert: opts.cert,
      key: opts.key,
      rejectUnauthorized: !cluster.skipTLSVerify,
    };

    return new Promise((resolve, reject) => {
      const req = https.request(requestOpts, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on("error", reject);
      req.end();
    });
  }

  /**
   * Cache resources from an API response
   */
  private cacheResources(
    resources: any[],
    group: string,
    version: string
  ): void {
    for (const resource of resources) {
      if (resource.name.includes("/")) continue; // Skip subresources

      const apiResource: ApiResource = {
        name: resource.name,
        singularName: resource.singularName || resource.name,
        namespaced: resource.namespaced,
        group,
        version,
        kind: resource.kind,
      };

      // Cache by full name and short name
      const fullKey = group
        ? `${resource.name}.${group}`.toLowerCase()
        : resource.name.toLowerCase();
      this.apiResourceCache.set(fullKey, apiResource);

      if (!this.apiResourceCache.has(resource.name.toLowerCase())) {
        this.apiResourceCache.set(resource.name.toLowerCase(), apiResource);
      }
    }
  }

  /**
   * Discover and cache API resources from the cluster
   */
  private async discoverApiResources(): Promise<void> {
    if (this.cacheInitialized) return;

    try {
      const client = this.kc.makeApiClient(ApisApi);
      const apiGroupList = await client.getAPIVersions();

      // Discover API groups
      for (const group of apiGroupList.groups) {
        try {
          const data = await this.makeRequest(
            `/apis/${group.name}/${group.preferredVersion?.version}`
          );
          if (data?.resources) {
            this.cacheResources(
              data.resources,
              group.name,
              group.preferredVersion?.version || "v1"
            );
          }
        } catch (err) {
          console.warn(
            `[K8s] Skipping API group ${group.name} due to error:`,
            err
          );
        }
      }
      this.cacheInitialized = true;
      console.log(
        `[K8s] Discovered ${this.apiResourceCache.size} API resources`
      );
    } catch (error) {
      console.error("[K8s] Failed to discover API resources:", error);
      throw error;
    }
  }

  /**
   * Build watch path for a resource
   */
  private buildWatchPath(resource: ApiResource, namespace?: string): string {
    const parts = [resource.group ? "/apis" : "/api"];

    if (resource.group) parts.push(resource.group);
    parts.push(resource.version);
    if (resource.namespaced && namespace) parts.push("namespaces", namespace);
    parts.push(resource.name);

    return parts.join("/");
  }

  /**
   * Get the watch path for a given resource kind
   */
  private async getWatchPath(
    kind: string,
    namespace?: string
  ): Promise<string> {
    await this.discoverApiResources();

    const resource = this.apiResourceCache.get(kind.toLowerCase());
    if (!resource) {
      const sample = Array.from(this.apiResourceCache.keys()).slice(0, 5);
      throw new Error(
        `Unknown resource: ${kind}. Sample keys: ${sample.join(", ")}`
      );
    }

    return this.buildWatchPath(resource, namespace);
  }

  /**
   * Subscribe to watch events for a specific resource kind
   */
  subscribe(
    kind: string,
    callback: EventCallback,
    namespace?: string
  ): () => void {
    const watchKey = namespace ? `${kind}:${namespace}` : kind;

    // If watcher doesn't exist, create it (but don't wait for it)
    if (!this.watchers.has(watchKey)) {
      // Create a placeholder watcher immediately
      this.watchers.set(watchKey, {
        watch: new Watch(this.kc),
        callbacks: new Set(),
        path: '',
        resourceVersion: undefined,
        resourceCache: new Map(),
      });
      
      // Start the watcher asynchronously
      this.startWatcher(kind, namespace).catch(err => {
        console.error(`[K8s] Failed to start watcher for ${watchKey}:`, err);
        // Remove the placeholder if startup fails
        this.watchers.delete(watchKey);
        
        // Notify callback of error
        callback({
          type: 'ERROR',
          error: `Failed to start watcher: ${err.message}`
        });
      });
    }

    const watcher = this.watchers.get(watchKey);
    if (!watcher) {
      throw new Error(`Failed to create watcher for ${watchKey}`);
    }

    // Send cached resources to new subscriber immediately
    watcher.resourceCache.forEach((resource) => {
      try {
        callback({
          type: 'ADDED',
          resource,
        });
      } catch (err) {
        console.error(`[K8s] Error sending cached resource to new subscriber:`, err);
      }
    });

    // Add callback to the set
    watcher.callbacks.add(callback);
    // Only log when first subscriber or every 5th subscriber to reduce noise
    if (watcher.callbacks.size === 1 || watcher.callbacks.size % 5 === 0) {
      console.log(
        `[K8s] Subscribed to ${watchKey} (${watcher.callbacks.size} subscribers)`
      );
    }

    // Return unsubscribe function
    return () => {
      const w = this.watchers.get(watchKey);
      if (w) {
        w.callbacks.delete(callback);
        // Only log when last subscriber removed
        if (w.callbacks.size === 0) {
          console.log(`[K8s] All subscribers removed from ${watchKey}`);
          this.stopWatcher(watchKey);
        }
      }
    };
  }

  /**
   * Start watching a specific resource kind
   */
  private async startWatcher(kind: string, namespace?: string): Promise<void> {
    const watchKey = namespace ? `${kind}:${namespace}` : kind;

    try {
      const path = await this.getWatchPath(kind, namespace);

      console.log(`[K8s] Starting watcher for ${watchKey}`);

      const watch = new Watch(this.kc);
      const abortController = new AbortController();

      // Get existing watcher (placeholder) or create new
      const existingWatcher = this.watchers.get(watchKey);
      const callbacks = existingWatcher?.callbacks || new Set();

      this.watchers.set(watchKey, {
        watch,
        callbacks,
        path,
        resourceVersion: undefined,
        resourceCache: new Map(),
      });
      this.watchAbortControllers.set(watchKey, abortController);

      // Fetch initial list before starting watch
      await this.fetchInitialList(watchKey, path);

      // Start the watch
      this.runWatch(watchKey, watch, path, abortController.signal);
    } catch (error) {
      console.error(`[K8s] Failed to start watcher for ${watchKey}:`, error);
      throw error;
    }
  }

  /**
   * Fetch initial list of resources
   */
  private async fetchInitialList(watchKey: string, path: string): Promise<void> {
    try {
      console.log(`[K8s] Fetching initial list for ${watchKey}...`);
      const data = await this.makeRequest(path);
      
      const watcher = this.watchers.get(watchKey);
      if (!watcher) return;

      // Store resourceVersion from list
      if (data.metadata?.resourceVersion) {
        watcher.resourceVersion = data.metadata.resourceVersion;
      }

      // Cache all items
      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item: KubernetesObject) => {
          const uid = item.metadata?.uid;
          if (uid) {
            watcher.resourceCache.set(uid, item);
          }
        });
        console.log(`[K8s] Cached ${data.items.length} resources for ${watchKey}`);
      }
    } catch (err) {
      console.error(`[K8s] Failed to fetch initial list for ${watchKey}:`, err);
      // Don't throw - continue with watch anyway
    }
  }

  /**
   * Run the watch loop with automatic restart on errors
   */
  private async runWatch(
    watchKey: string,
    watch: Watch,
    path: string,
    signal: AbortSignal
  ): Promise<void> {
    let retryCount = 0;
    const maxRetries = 5;
    const baseDelay = 1000;
    let consecutiveRestarts = 0;

    while (!signal.aborted) {
      try {
        // Only log initial watch start, not every restart
        if (retryCount === 0 && consecutiveRestarts === 0) {
          console.log(`[K8s] Watching ${watchKey}...`);
        }

        const watcher = this.watchers.get(watchKey);
        if (!watcher) break;

        // Build query options with resourceVersion if available
        const queryOptions: any = {};
        if (watcher.resourceVersion) {
          queryOptions.resourceVersion = watcher.resourceVersion;
          // Allow watch to continue from this version
          queryOptions.allowWatchBookmarks = true;
        }

        await watch.watch(
          path,
          queryOptions,
          (type, apiObj) => {
            const watcher = this.watchers.get(watchKey);
            if (!watcher) return;

            // Update resourceVersion from the received object
            if (apiObj?.metadata?.resourceVersion) {
              watcher.resourceVersion = apiObj.metadata.resourceVersion;
            }

            // Skip BOOKMARK events - they're internal watch continuation markers
            if (type === "BOOKMARK") {
              return;
            }

            // Update resource cache
            const uid = apiObj?.metadata?.uid;
            if (uid) {
              if (type === "DELETED") {
                watcher.resourceCache.delete(uid);
              } else {
                watcher.resourceCache.set(uid, apiObj as KubernetesObject);
              }
            }

            const event: ResourceEvent = {
              type: type as ResourceEvent["type"],
              resource: apiObj as KubernetesObject,
            };

            // Broadcast to all subscribers
            watcher.callbacks.forEach((callback) => {
              try {
                callback(event);
              } catch (err) {
                console.error(`[K8s] Error in callback for ${watchKey}:`, err);
              }
            });
          },
          (err) => {
            if (signal.aborted) return;

            // Handle 404 errors silently (resource type doesn't exist in cluster)
            const is404 = err && (err as any).statusCode === 404;
            if (is404) {
              // Only log 404 once per watcher lifecycle
              if (consecutiveRestarts === 0) {
                console.log(
                  `[K8s] Resource ${watchKey} not available in cluster (404)`
                );
              }
            } else if (err) {
              // Only log actual errors, not normal watch completions
              console.error(`[K8s] Watch error for ${watchKey}:`, err);
              
              const watcher = this.watchers.get(watchKey);
              if (!watcher) return;

              // Only broadcast actual errors to subscribers, not normal completions
              const errorEvent: ResourceEvent = {
                type: "ERROR",
                error: err?.message || "Unknown watch error",
              };

              watcher.callbacks.forEach((callback) => {
                try {
                  callback(errorEvent);
                } catch (cbErr) {
                  console.error(
                    `[K8s] Error in error callback for ${watchKey}:`,
                    cbErr
                  );
                }
              });
            }

            // Will retry in the outer loop
          }
        );

        // If watch completes normally, reset retry count
        retryCount = 0;
        consecutiveRestarts++;

        // If not aborted, restart after a short delay
        if (!signal.aborted) {
          // Don't log every restart to reduce noise
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (err) {
        if (signal.aborted) break;

        retryCount++;
        consecutiveRestarts++;
        const delay = Math.min(baseDelay * 2 ** retryCount, 30000);

        // Handle 404 errors silently
        const is404 = err && (err as any).statusCode === 404;
        if (is404) {
          // Only log 404 once at the start
          if (retryCount === 1) {
            console.log(
              `[K8s] Resource ${watchKey} not found (404), will retry silently...`
            );
          }
        } else {
          console.error(
            `[K8s] Failed to start watch for ${watchKey} (attempt ${retryCount}/${maxRetries}):`,
            err
          );
        }

        if (retryCount >= maxRetries) {
          if (!is404) {
            console.error(
              `[K8s] Max retries reached for ${watchKey}, stopping watch`
            );
          }
          this.stopWatcher(watchKey);
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Stop watching a specific resource kind
   */
  private stopWatcher(watchKey: string): void {
    console.log(`[K8s] Stopping watcher for ${watchKey}`);

    const abortController = this.watchAbortControllers.get(watchKey);
    if (abortController) {
      abortController.abort();
      this.watchAbortControllers.delete(watchKey);
    }

    this.watchers.delete(watchKey);
  }

  /**
   * Get the current kubeconfig context
   */
  getCurrentContext(): string {
    return this.kc.getCurrentContext();
  }

  /**
   * Cleanup all watchers
   */
  cleanup(): void {
    console.log("[K8s] Cleaning up all watchers");
    this.watchAbortControllers.forEach((controller) => controller.abort());
    this.watchers.clear();
    this.watchAbortControllers.clear();
  }
}

// Singleton instance
let informerManager: K8sInformerManager | null = null;

export function getInformerManager(): K8sInformerManager {
  if (!informerManager) {
    informerManager = new K8sInformerManager();
  }
  return informerManager;
}
