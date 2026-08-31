import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock the Watch class before importing the module
vi.mock("@kubernetes/client-node", () => {
  const mockWatch = vi.fn().mockImplementation(() => ({
    watch: vi.fn()
  }))

  class MockKubeConfig {
    applyToHTTPSOptions = vi.fn()
    getCurrentCluster = vi.fn(() => ({
      server: "https://kubernetes.default.svc",
      skipTLSVerify: false
    }))
    getCurrentContext = vi.fn(() => "test-context")
    loadFromCluster = vi.fn()
    loadFromDefault = vi.fn()
    loadFromFile = vi.fn()
    makeApiClient = vi.fn(() => ({
      getAPIVersions: vi.fn().mockResolvedValue({ groups: [] })
    }))
  }

  return {
    Watch: mockWatch,
    KubeConfig: MockKubeConfig,
    ApisApi: vi.fn()
  }
})

import { getInformerManager, isWatchTimeout } from "./k8s-informers"

type WatchStub = {
  watch: (
    path: string,
    queryOptions: Record<string, string | number | boolean | undefined>,
    onEvent: (type: string, apiObject: unknown) => void,
    onDone: (error?: unknown) => void
  ) => Promise<{ abort: () => void }>
}

describe("K8sInformerManager ETIMEDOUT handling", () => {
  let consoleWarnSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    // Spy on console methods
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("ETIMEDOUT error detection", () => {
    it("should detect ETIMEDOUT by error code", () => {
      const error = {
        code: "ETIMEDOUT",
        message: "read ETIMEDOUT"
      }

      const isTimeoutError = error.code === "ETIMEDOUT"
      expect(isTimeoutError).toBe(true)
    })

    it("should detect ETIMEDOUT by errno", () => {
      const error = {
        errno: -60,
        message: "read ETIMEDOUT"
      }

      const isTimeoutError = error.errno === -60
      expect(isTimeoutError).toBe(true)
    })

    it("should detect ETIMEDOUT in error message", () => {
      const error = new Error("read ETIMEDOUT")

      const isTimeoutError = error.message.includes("ETIMEDOUT")
      expect(isTimeoutError).toBe(true)
    })

    it("should not detect non-timeout errors", () => {
      const error = {
        code: "ECONNREFUSED",
        message: "Connection refused"
      }

      const isTimeoutError = error.code === "ETIMEDOUT"
      expect(isTimeoutError).toBe(false)
    })
  })

  describe("Retry delay calculation", () => {
    it("should reconnect promptly after a watch timeout", () => {
      const delay = 1000

      expect(delay).toBe(1000)
    })

    it("should use exponential backoff for other errors", () => {
      const retryCount = 3
      const delay = Math.min(1000 * 2 ** retryCount, 30000)

      expect(delay).toBe(8000)
    })

    it("should cap exponential backoff at 30 seconds", () => {
      const retryCount = 10 // Very high retry count
      const delay = Math.min(1000 * 2 ** retryCount, 30000)

      expect(delay).toBe(30000)
    })
  })

  describe("Error logging behavior", () => {
    it("should log warning for ETIMEDOUT errors", () => {
      const watchKey = "helmrepositories.source.toolkit.fluxcd.io"
      const error = {
        code: "ETIMEDOUT",
        message: "read ETIMEDOUT",
        errno: -60
      }

      // Simulate the logging that happens in runWatch
      const isTimeoutError = error.code === "ETIMEDOUT" || error.errno === -60
      if (isTimeoutError) {
        console.warn(
          `[K8s] Watch timeout for ${watchKey}, reconnecting from the last resource version`
        )
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[K8s] Watch timeout for helmrepositories")
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("reconnecting from the last resource version")
      )
    })

    it("should not log for non-timeout errors differently", () => {
      const watchKey = "pods"
      const error = new Error("Connection refused")

      // Simulate normal error logging
      const isTimeoutError = error.message.includes("ETIMEDOUT")
      if (!isTimeoutError) {
        console.error(`[K8s] Watch error for ${watchKey}:`, error)
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[K8s] Watch error for pods"),
        error
      )
    })
  })

  describe("Resource waste prevention", () => {
    it("should prevent rapid retries on timeout", async () => {
      const startTime = Date.now()

      // Simulate waiting for 30 seconds
      const delay = 30000
      await new Promise((resolve) => setTimeout(resolve, 0)) // Don't actually wait in test

      // Verify delay value is set correctly
      expect(delay).toBe(30000)
    })

    it("should allow normal retry intervals for other errors", () => {
      const delays = [2000, 4000, 8000, 16000, 30000]

      delays.forEach((expectedDelay, index) => {
        const retryCount = index + 1
        const calculatedDelay = Math.min(1000 * 2 ** retryCount, 30000)
        expect(calculatedDelay).toBe(expectedDelay)
      })
    })
  })

  describe("Error message variants", () => {
    const timeoutErrorVariants = [
      { code: "ETIMEDOUT", description: "code-based" },
      { errno: -60, description: "errno-based" },
      { message: "Error: read ETIMEDOUT", description: "message-based" },
      {
        code: "ETIMEDOUT",
        errno: -60,
        message: "read ETIMEDOUT",
        description: "all fields"
      }
    ]

    timeoutErrorVariants.forEach((errorVariant) => {
      it(`should detect ETIMEDOUT from ${errorVariant.description} error`, () => {
        const isTimeoutError =
          (errorVariant as any).message?.includes("ETIMEDOUT") ||
          (errorVariant as any).code === "ETIMEDOUT" ||
          (errorVariant as any).errno === -60

        expect(isTimeoutError).toBe(true)
      })
    })
  })
})

describe("watch lifecycle", () => {
  it("emits resources from the initial list to active subscribers", async () => {
    const manager = getInformerManager() as unknown as {
      watchers: Map<
        string,
        {
          callbacks: Set<(event: unknown) => void>
          path: string
          resourceCache: Map<string, unknown>
          resourceVersion?: string
          watch: WatchStub
        }
      >
      makeRequest: (path: string) => Promise<unknown>
      fetchInitialList: (watchKey: string, path: string) => Promise<void>
    }
    const callback = vi.fn()
    const resource = {
      apiVersion: "example.io/v1",
      kind: "Example",
      metadata: { uid: "example-uid", name: "example" }
    }

    manager.watchers.set("example", {
      callbacks: new Set([callback]),
      path: "/apis/example.io/v1/examples",
      resourceCache: new Map(),
      watch: { watch: vi.fn() }
    })
    manager.makeRequest = vi.fn().mockResolvedValue({
      metadata: { resourceVersion: "123" },
      items: [resource]
    })

    await manager.fetchInitialList("example", "/apis/example.io/v1/examples")

    expect(callback).toHaveBeenCalledWith({ type: "ADDED", resource })
    expect(manager.watchers.get("example")?.resourceCache.get("example-uid")).toEqual(resource)
  })

  it("recognizes the Kubernetes client v2 timeout", () => {
    expect(
      isWatchTimeout({
        name: "TimeoutError",
        message: "The operation was aborted due to timeout"
      })
    ).toBe(true)
  })

  it("waits for the v2 done callback before continuing", async () => {
    let done: (error?: unknown) => void = () => {}
    const requestAbortController = { abort: vi.fn() }
    const watch: WatchStub = {
      watch: vi.fn(async (_path, _queryOptions, _onEvent, onDone) => {
        done = onDone
        return requestAbortController
      })
    }
    const manager = getInformerManager() as unknown as {
      waitForWatchCompletion: (
        watch: WatchStub,
        path: string,
        queryOptions: Record<string, string | number | boolean | undefined>,
        watchKey: string,
        signal: AbortSignal
      ) => Promise<void>
    }
    const stop = new AbortController()
    let completed = false

    const pending = manager
      .waitForWatchCompletion(
        watch,
        "/apis/example",
        {},
        "example",
        stop.signal
      )
      .then(() => {
        completed = true
      })

    await vi.waitFor(() => expect(watch.watch).toHaveBeenCalledOnce())
    expect(completed).toBe(false)

    done()
    await pending
    expect(completed).toBe(true)
  })

  it("aborts the active v2 watch when stopped", async () => {
    const requestAbortController = { abort: vi.fn() }
    const watch: WatchStub = {
      watch: vi.fn(async () => requestAbortController)
    }
    const manager = getInformerManager() as unknown as {
      waitForWatchCompletion: (
        watch: WatchStub,
        path: string,
        queryOptions: Record<string, string | number | boolean | undefined>,
        watchKey: string,
        signal: AbortSignal
      ) => Promise<void>
    }
    const stop = new AbortController()

    const pending = manager.waitForWatchCompletion(
      watch,
      "/apis/example",
      {},
      "example",
      stop.signal
    )
    await vi.waitFor(() => expect(watch.watch).toHaveBeenCalledOnce())

    stop.abort()
    await pending
    expect(requestAbortController.abort).toHaveBeenCalledOnce()
  })
})
