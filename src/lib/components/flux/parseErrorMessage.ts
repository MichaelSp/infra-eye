/**
 * Parses Kubernetes error messages that contain embedded JSON
 * Example: "Helm upgrade failed: cannot patch ... : json: cannot unmarshal bool..."
 */

export interface ParsedError {
  summary: string // The human-readable part
  embeddedJson?: string // The extracted JSON if present
  actualError?: string // The actual validation error extracted from the JSON
  isComplex: boolean // True if the message contains embedded JSON
}

/**
 * Try to extract JSON from an error message
 * Looks for patterns like: '{"apiVersion":"..."...}": error message'
 */
function extractEmbeddedJson(message: string): {
  json: string
  error: string
} | null {
  // Common Flux/Helm structure:
  // ... Invalid value: "{...}": json: cannot unmarshal ...
  const invalidPrefix = 'Invalid value: "'
  const invalidIndex = message.indexOf(invalidPrefix)

  if (invalidIndex >= 0) {
    const start = invalidIndex + invalidPrefix.length
    const endMarkerIndex = message.indexOf('": json:', start)

    if (endMarkerIndex > start) {
      return {
        json: message.substring(start, endMarkerIndex),
        error: message.substring(endMarkerIndex + 2).trim()
      }
    }
  }

  // Fallback for messages that contain an inline JSON object.
  const firstBrace = message.indexOf("{")
  if (firstBrace >= 0) {
    let depth = 0
    let end = -1

    for (let i = firstBrace; i < message.length; i++) {
      const char = message[i]
      if (char === "{") depth += 1
      if (char === "}") {
        depth -= 1
        if (depth === 0) {
          end = i
          break
        }
      }
    }

    if (end > firstBrace) {
      const json = message.substring(firstBrace, end + 1)
      const error = message
        .substring(end + 1)
        .replace(/^":?\s*/, "")
        .trim()
      return { json, error }
    }
  }

  return null
}

/**
 * Extract the actual validation error from a JSON error message
 * Example: 'json: cannot unmarshal bool into Go struct field EnvVar.spec.template.spec.containers.env.value of type string'
 */
function extractValidationError(errorString: string): string {
  // Look for common error patterns
  const patterns = [
    /json:\s*cannot unmarshal.+$/i,
    /field[^:]*is invalid:\s*.+$/i,
    /Invalid value:\s*"[^"]*"\s*:\s*.+$/i,
    /admission webhook.+denied the request:\s*.+$/i,
    /patch:\s*.+$/i
  ]

  for (const pattern of patterns) {
    const match = errorString.match(pattern)
    if (match) {
      return match[0]
    }
  }

  // Return first sentence if no pattern matches
  const sentences = errorString.split(/[.!?]/)
  return sentences[0].trim() || errorString
}

/**
 * Format JSON into readable multi-line format
 */
function formatJson(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString)
    return JSON.stringify(parsed, null, 2)
  } catch {
    // If parsing fails, return original with line breaks at key points
    return jsonString
      .replace(/","/g, '",\n  "')
      .replace(/":{"f:/g, '": {\n    "f:')
  }
}

/**
 * Truncate JSON to a readable length, keeping important structure
 */
function truncateJson(jsonString: string, maxLength: number = 150): string {
  if (jsonString.length <= maxLength) {
    return jsonString
  }

  // Try to find a logical break point
  const truncated = jsonString.substring(0, maxLength)
  const lastBrace = Math.max(
    truncated.lastIndexOf("}"),
    truncated.lastIndexOf("]")
  )

  if (lastBrace > maxLength - 50) {
    return `${truncated.substring(0, lastBrace + 1)}...}`
  }

  return `${truncated}...`
}

/**
 * Parse a Kubernetes error message
 * Returns structured information about the error
 */
export function parseErrorMessage(message: string): ParsedError {
  if (!message) {
    return {
      summary: message,
      isComplex: false
    }
  }

  const extracted = extractEmbeddedJson(message)
  const hasKnownErrorMarkers =
    message.includes("json:") ||
    message.includes("Invalid value:") ||
    message.includes("is invalid:") ||
    message.includes("denied the request:")

  if (extracted) {
    const summary = message
      .substring(0, message.indexOf(extracted.json))
      .trim()
      .replace(/['"]+$/, "")

    const actualError = extractValidationError(extracted.error)

    return {
      summary: summary || message,
      embeddedJson: extracted.json,
      actualError,
      isComplex: true
    }
  }

  if (hasKnownErrorMarkers) {
    return {
      summary: message,
      actualError: extractValidationError(message),
      isComplex: true
    }
  }

  // Check for other complex patterns
  if (message.includes("\n") || message.length > 500) {
    return {
      summary: message.split("\n")[0],
      isComplex: true
    }
  }

  return {
    summary: message,
    isComplex: false
  }
}

/**
 * Get a short summary suitable for table display
 */
export function getSummaryMessage(
  message: string,
  maxLength: number = 100
): string {
  const parsed = parseErrorMessage(message)
  const full = parsed.actualError || parsed.summary || message

  if (full.length > maxLength) {
    return `${full.substring(0, maxLength)}...`
  }
  return full
}

export { formatJson, truncateJson }
