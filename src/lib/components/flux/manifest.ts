import yaml from "js-yaml"

export function filterResourceManifest(input: unknown): unknown {
  if (!input || typeof input !== "object") return input

  const filtered = JSON.parse(JSON.stringify(input))

  if (filtered?.metadata?.managedFields) {
    filtered.metadata.managedFields = `[${filtered.metadata.managedFields.length} entries collapsed]`
  }

  if (
    filtered?.metadata?.annotations?.[
      "kubectl.kubernetes.io/last-applied-configuration"
    ]
  ) {
    const original =
      filtered.metadata.annotations[
        "kubectl.kubernetes.io/last-applied-configuration"
      ]
    filtered.metadata.annotations[
      "kubectl.kubernetes.io/last-applied-configuration"
    ] = `[${original.length} chars collapsed]`
  }

  return filtered
}

export function resourceToYaml(input: unknown): string {
  const filtered = filterResourceManifest(input)
  return yaml.dump(filtered, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  })
}

export function jsonStringToYaml(jsonString: string): string {
  const candidates = [
    jsonString,
    jsonString.replace(/\\"/g, '"'),
    jsonString.replace(/\\\\"/g, '\\"').replace(/\\"/g, '"')
  ]

  for (const candidate of candidates) {
    try {
      return resourceToYaml(JSON.parse(candidate))
    } catch {
      // Try next candidate.
    }
  }

  return jsonString
}
