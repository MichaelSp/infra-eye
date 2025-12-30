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

interface WatcherState {
  watch: Watch;
  callbacks: Set<EventCallback>;
  path: string;
  resourceVersion?: string;
  resourceCache: Map<string, KubernetesObject>;
}

class K8sInformerManager {
  private kc: KubeConfig;
  private watchers = new Map<string, WatcherState>();
  private watchAbortControllers = new Map<string, AbortController>();
  private apiResourceCache = new Map<string, ApiResource>();
  private cacheInitialized = false;
  private discoveryPromise: Promise<void> | null = null;

  constructor() {
    this.kc = new KubeConfig();
    this.loadKubeconfig();
    this.discoverApiResources().catch((err) =>
      console.error("[K8s] Failed to discover API resources:", err)
    );
  }

  private loadKubeconfig(): void {
    try {
      if (process.env.KUBERNETES_SERVICE_HOST) {
        console.log("[K8s] Loading in-cluster configuration");
        this.kc.loadFromCluster();
      } else if (process.env.KUBECONFIG) {
        console.log(`[K8s] Loading kubeconfig from: ${process.env.KUBECONFIG}`);
        this.kc.loadFromFile(process.env.KUBECONFIG);
      } else {
        this.loadFromDefaultLocation();
      }
      console.log("[K8s] Kubeconfig loaded successfully");
    } catch (error) {
      console.error("[K8s] Failed to load kubeconfig:", error);
      throw error;
    }
  }

  private loadFromDefaultLocation(): void {
    try {
      this.kc.loadFromDefault();
    } catch (err: any) {
      if (err.code === "ENOENT" && err.path?.includes(".switch_tmp")) {
        console.warn("[K8s] Temp kubeconfig not found, trying standard path");
        this.kc.loadFromFile(`${process.env.HOME}/.kube/config`);
      } else {
        throw err;
      }
    }
  }

  private async makeRequest(path: string): Promise<any> {
    const cluster = this.kc.getCurrentCluster();
    if (!cluster) throw new Error("No cluster configured");

    const opts: any = {};
    this.kc.applyToHTTPSOptions(opts);

    const url = new URL(cluster.server + path);
    const requestOpts: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "GET",
      headers: opts.headers || {},
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
          if (res.statusCode && res.statusCode >= 400) {
            const error: any = new Error(`HTTP ${res.statusCode}`);
            error.statusCode = res.statusCode;
            error.body = body;
            reject(error);
            return;
          }

          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${path}`));
          }
        });
      });
      req.on("error", reject);
      req.end();
    });
  }

  private cacheApiResource(
    resource: any,
    group: string,
    version: string
  ): void {
    if (resource.name.includes("/")) return; // Skip subresources

    const apiResource: ApiResource = {
      name: resource.name,
      singularName: resource.singularName || resource.name,
      namespaced: resource.namespaced,
      group,
      version,
      kind: resource.kind,
    };

    // Cache by full name (e.g., "helmreleases.helm.toolkit.fluxcd.io")
    const fullKey = group
      ? `${resource.name}.${group}`.toLowerCase()
      : resource.name.toLowerCase();
    this.apiResourceCache.set(fullKey, apiResource);

    // Also cache by short name if not already taken
    const shortKey = resource.name.toLowerCase();
    if (!this.apiResourceCache.has(shortKey)) {
      this.apiResourceCache.set(shortKey, apiResource);
    }
  }

  private async discoverApiResources(): Promise<void> {
    if (this.cacheInitialized) return;
    if (this.discoveryPromise) return this.discoveryPromise;

    this.discoveryPromise = (async () => {
      try {
        const client = this.kc.makeApiClient(ApisApi);
        const apiGroupList = await client.getAPIVersions();

        for (const group of apiGroupList.groups) {
          const versions = group.versions || [group.preferredVersion].filter(Boolean);

          for (const versionInfo of versions) {
            if (!versionInfo) continue;

            try {
              const path = `/apis/${group.name}/${versionInfo.version}`;
              const data = await this.makeRequest(path);

              if (data?.resources) {
                data.resources.forEach((res: any) =>
                  this.cacheApiResource(res, group.name, versionInfo.version)
                );
              }
            } catch (err: any) {
              const statusCode = err?.statusCode;
              if (statusCode !== 401 && statusCode !== 403) {
                console.warn(
                  `[K8s] Failed to discover ${group.name}/${versionInfo.version}`
                );
              }
            }
          }
        }

        this.cacheInitialized = true;
        console.log(`[K8s] Discovered ${this.apiResourceCache.size} API resources`);
      } catch (error) {
        this.discoveryPromise = null;
        throw error;
      }
    })();

    return this.discoveryPromise;
  }

  private buildWatchPath(resource: ApiResource, namespace?: string): string {
    const parts = [resource.group ? "/apis" : "/api"];
    if (resource.group) parts.push(resource.group);
    parts.push(resource.version);
    if (resource.namespaced && namespace) {
      parts.push("namespaces", namespace);
    }
    parts.push(resource.name);
    return parts.join("/");
  }

  private async getWatchPath(kind: string, namespace?: string): Promise<string | null> {
    await this.discoverApiResources();
    const resource = this.apiResourceCache.get(kind.toLowerCase());
    return resource ? this.buildWatchPath(resource, namespace) : null;
  }

  private notifyError(watchKey: string, error: string): void {
    const watcher = this.watchers.get(watchKey);
    if (!watcher) return;

    const errorEvent: ResourceEvent = { type: "ERROR", error };
    watcher.callbacks.forEach((callback) => {
      try {
        callback(errorEvent);
      } catch (err) {
        console.error(`[K8s] Error in callback for ${watchKey}:`, err);
      }
    });
  }

  subscribe(kind: string, callback: EventCallback, namespace?: string): () => void {
    const watchKey = namespace ? `${kind}:${namespace}` : kind;

    if (!this.watchers.has(watchKey)) {
      this.watchers.set(watchKey, {
        watch: new Watch(this.kc),
        callbacks: new Set(),
        path: "",
        resourceVersion: undefined,
        resourceCache: new Map(),
      });

      this.startWatcher(kind, namespace).catch((err) => {
        console.error(`[K8s] Failed to start watcher for ${watchKey}:`, err);
        this.watchers.delete(watchKey);
        callback({ type: "ERROR", error: `Failed to start watcher: ${err.message}` });
      });
    }

    const watcher = this.watchers.get(watchKey);
    if (!watcher) throw new Error(`Failed to create watcher for ${watchKey}`);

    // Send cached resources to new subscriber
    watcher.resourceCache.forEach((resource) => {
      try {
        callback({ type: "ADDED", resource });
      } catch (err) {
        console.error(`[K8s] Error sending cached resource:`, err);
      }
    });

    watcher.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      const w = this.watchers.get(watchKey);
      if (w) {
        w.callbacks.delete(callback);
        if (w.callbacks.size === 0) {
          this.stopWatcher(watchKey);
        }
      }
    };
  }

  private async startWatcher(kind: string, namespace?: string): Promise<void> {
    const watchKey = namespace ? `${kind}:${namespace}` : kind;
    const path = await this.getWatchPath(kind, namespace);

    if (!path) {
      console.warn(`[K8s] Resource type '${kind}' not available - skipping watcher`);
      this.notifyError(watchKey, `Resource type '${kind}' not available in this cluster`);
      this.watchers.delete(watchKey);
      return;
    }

    const watch = new Watch(this.kc);
    const abortController = new AbortController();
    const existingWatcher = this.watchers.get(watchKey);

    this.watchers.set(watchKey, {
      watch,
      callbacks: existingWatcher?.callbacks || new Set(),
      path,
      resourceVersion: undefined,
      resourceCache: new Map(),
    });
    this.watchAbortControllers.set(watchKey, abortController);

    await this.fetchInitialList(watchKey, path);
    this.runWatch(watchKey, watch, path, abortController.signal);
  }

  private async fetchInitialList(watchKey: string, path: string): Promise<void> {
    try {
      const data = await this.makeRequest(path);
      const watcher = this.watchers.get(watchKey);
      if (!watcher) return;

      if (data.metadata?.resourceVersion) {
        watcher.resourceVersion = data.metadata.resourceVersion;
      }

      if (data.items && Array.isArray(data.items)) {
        data.items.forEach((item: KubernetesObject) => {
          const uid = item.metadata?.uid;
          if (uid) watcher.resourceCache.set(uid, item);
        });
        console.log(`[K8s] Cached ${data.items.length} resources for ${watchKey}`);
      }
    } catch (err) {
      console.error(`[K8s] Failed to fetch initial list for ${watchKey}`);
    }
  }

  private async runWatch(
    watchKey: string,
    watch: Watch,
    path: string,
    signal: AbortSignal
  ): Promise<void> {
    let retryCount = 0;
    const maxRetries = 5;

    while (!signal.aborted) {
      try {
        const watcher = this.watchers.get(watchKey);
        if (!watcher) break;

        const queryOptions: any = {};
        if (watcher.resourceVersion) {
          queryOptions.resourceVersion = watcher.resourceVersion;
          queryOptions.allowWatchBookmarks = true;
        }

        await watch.watch(
          path,
          queryOptions,
          (type, apiObj) => this.handleWatchEvent(watchKey, type, apiObj),
          (err) => this.handleWatchError(watchKey, err)
        );

        retryCount = 0;
        if (!signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (err) {
        if (signal.aborted) break;

        retryCount++;
        const delay = Math.min(1000 * 2 ** retryCount, 30000);

        if (retryCount >= maxRetries) {
          console.error(`[K8s] Max retries reached for ${watchKey}`);
          this.stopWatcher(watchKey);
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private handleWatchEvent(watchKey: string, type: string, apiObj: any): void {
    const watcher = this.watchers.get(watchKey);
    if (!watcher) return;

    if (apiObj?.metadata?.resourceVersion) {
      watcher.resourceVersion = apiObj.metadata.resourceVersion;
    }

    if (type === "BOOKMARK") return;

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

    watcher.callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error(`[K8s] Error in callback for ${watchKey}:`, err);
      }
    });
  }

  private handleWatchError(watchKey: string, err: any): void {
    if (err && (err as any).statusCode !== 404) {
      console.error(`[K8s] Watch error for ${watchKey}:`, err);
      this.notifyError(watchKey, err?.message || "Unknown watch error");
    }
  }

  private stopWatcher(watchKey: string): void {
    const abortController = this.watchAbortControllers.get(watchKey);
    if (abortController) {
      abortController.abort();
      this.watchAbortControllers.delete(watchKey);
    }
    this.watchers.delete(watchKey);
  }

  getCurrentContext(): string {
    return this.kc.getCurrentContext();
  }

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
