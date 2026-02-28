import { json, type RequestHandler } from "@sveltejs/kit"
import { KubeConfig } from "@kubernetes/client-node"
import https from "node:https"

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json()
    const { namespace, name, kind, group, version, force } = body

    // Validate required fields
    if (!namespace || !name || !kind || !version) {
      return json(
        {
          error: "Missing required fields: namespace, name, kind, version",
          received: { namespace, name, kind, group, version }
        },
        { status: 400 }
      )
    }

    // Group can be empty string for core resources, but for Flux it should always have a group
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

    console.log(
      `[Reconcile] Triggering ${force ? "force-" : ""}reconcile for ${kind}/${name} in ${namespace} (group: ${group || "core"})`
    )

    const kc = new KubeConfig()
    if (process.env.KUBERNETES_SERVICE_HOST) {
      kc.loadFromCluster()
    } else if (process.env.KUBECONFIG) {
      kc.loadFromFile(process.env.KUBECONFIG)
    } else {
      kc.loadFromDefault()
    }

    // Parse plural from kind
    const [resourceName] = kind.toLowerCase().match(/[a-z]+/) || []
    if (!resourceName) {
      return json({ error: `Invalid kind format: ${kind}` }, { status: 400 })
    }
    const plural = `${resourceName}s`

    // Prepare the patch
    const timestamp = new Date().toISOString()
    const annotations: Record<string, string> = {
      "reconcile.fluxcd.io/requestedAt": timestamp
    }

    // Add force reconcile annotation if requested
    if (force) {
      annotations["reconcile.fluxcd.io/forceAt"] = timestamp
    }

    const patch = {
      metadata: {
        annotations
      }
    }

    console.log(`[Reconcile] Calling patchNamespacedCustomObject with:`, {
      group,
      version,
      namespace,
      plural,
      name,
      annotations
    })

    // Make a raw HTTPS request with the correct Content-Type header
    // This is necessary because the client library doesn't easily support merge-patch+json
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
        let body = ""
        res.on("data", (chunk) => (body += chunk))
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            const error: any = new Error(`HTTP ${res.statusCode}: ${body}`)
            error.statusCode = res.statusCode
            error.body = body
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

    console.log(`[Reconcile] Patch successful`)

    console.log(
      `[Reconcile] Successfully triggered ${force ? "force-" : ""}reconcile for ${kind}/${name}`
    )

    return json({
      success: true,
      message: `${force ? "Force-reconcile" : "Reconcile"} triggered successfully`,
      timestamp
    })
  } catch (error: any) {
    console.error("[Reconcile] Error:", error)
    return json(
      {
        error: error?.message || "Failed to trigger reconcile",
        details: error?.body || error
      },
      { status: 500 }
    )
  }
}
