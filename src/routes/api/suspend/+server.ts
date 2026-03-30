import { KubeConfig } from "@kubernetes/client-node"
import { json, type RequestHandler } from "@sveltejs/kit"
import https from "node:https"

function kindToPlural(kind: string): string {
  const normalized = kind.trim().toLowerCase()
  if (!normalized) return ""

  if (normalized.endsWith("y")) {
    return `${normalized.slice(0, -1)}ies`
  }

  return `${normalized}s`
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json()
    const { namespace, name, kind, group, version, suspended } = body

    if (
      !namespace ||
      !name ||
      !kind ||
      !version ||
      typeof suspended !== "boolean"
    ) {
      return json(
        {
          error:
            "Missing required fields: namespace, name, kind, version, suspended(boolean)",
          received: { namespace, name, kind, group, version, suspended }
        },
        { status: 400 }
      )
    }

    if (group === null || group === undefined) {
      return json(
        {
          error:
            "Group parameter is required (can be empty string for core resources)",
          received: { group }
        },
        { status: 400 }
      )
    }

    const plural = kindToPlural(kind)
    if (!plural) {
      return json({ error: `Invalid kind format: ${kind}` }, { status: 400 })
    }

    const kc = new KubeConfig()
    if (process.env.KUBERNETES_SERVICE_HOST) {
      kc.loadFromCluster()
    } else if (process.env.KUBECONFIG) {
      kc.loadFromFile(process.env.KUBECONFIG)
    } else {
      kc.loadFromDefault()
    }

    const patch = {
      spec: {
        suspend: suspended
      }
    }

    const cluster = kc.getCurrentCluster()
    if (!cluster) {
      throw new Error("No cluster configured")
    }

    const opts: any = {}
    kc.applyToHTTPSOptions(opts)

    const path = `/apis/${group}/${version}/namespaces/${namespace}/${plural}/${name}`
    const url = new URL(cluster.server + path)

    const requestOpts: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: "PATCH",
      headers: {
        ...opts.headers,
        "Content-Type": "application/merge-patch+json"
      },
      ca: opts.ca,
      cert: opts.cert,
      key: opts.key,
      rejectUnauthorized: !cluster.skipTLSVerify
    }

    await new Promise<void>((resolve, reject) => {
      const req = https.request(requestOpts, (res) => {
        let responseBody = ""
        res.on("data", (chunk) => (responseBody += chunk))
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            const error: any = new Error(
              `HTTP ${res.statusCode}: ${responseBody}`
            )
            error.statusCode = res.statusCode
            error.body = responseBody
            reject(error)
            return
          }
          resolve()
        })
      })
      req.on("error", reject)
      req.write(JSON.stringify(patch))
      req.end()
    })

    return json({
      success: true,
      message: suspended
        ? "Reconciliation suspended successfully"
        : "Reconciliation resumed successfully"
    })
  } catch (error: any) {
    return json(
      {
        error: error?.message || "Failed to update suspend state",
        details: error?.body || error
      },
      { status: 500 }
    )
  }
}