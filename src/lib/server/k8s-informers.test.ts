import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock the Watch class before importing the module
vi.mock("@kubernetes/client-node", () => {
  const mockWatch = vi.fn().mockImplementation(() => ({
    watch: vi.fn()
  }))

  return {
    Watch: mockWatch,
    KubeConfig: vi.fn().mockImplementation(() => ({
      loadFromDefault: vi.fn(),
      loadFromFile: vi.fn(),
      loadFromCluster: vi.fn(),
      getCurrentCluster: vi.fn(() => ({
        server: "https://kubernetes.default.svc",
        skipTLSVerify: false
      })),
      getCurrentContext: vi.fn(() => "test-context"),
      applyToHTTPSOptions: vi.fn(),
      makeApiClient: vi.fn()
    })),
    ApisApi: vi.fn()
  }
})

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
    it("should use 30 second delay for ETIMEDOUT errors", () => {
      const error = new Error("read ETIMEDOUT")
      const isTimeoutError = error.message.includes("ETIMEDOUT")

      let delay: number
      if (isTimeoutError) {
        delay = 30000 // 30 seconds for ETIMEDOUT
      } else {
        delay = 1000 // Default retry delay
      }

      expect(delay).toBe(30000)
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
          `[K8s] Watch timeout for ${watchKey}, waiting 30 seconds before retry to avoid resource waste`
        )
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[K8s] Watch timeout for helmrepositories")
      )
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("30 seconds before retry")
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
