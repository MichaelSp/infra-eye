import { describe, expect, it } from "vitest"
import { getSummaryMessage, parseErrorMessage } from "./parseErrorMessage"

describe("parseErrorMessage", () => {
  it("should parse a helm upgrade failure with embedded JSON error", () => {
    const message = `Helm upgrade failed for release paperless/open-webui with chart open-webui@12.13.0: cannot patch "open-webui" with kind StatefulSet:  "" is invalid: patch: Invalid value: "{\\"apiVersion\\":\\"apps/v1\\",\\"kind\\":\\"StatefulSet\\",\\"metadata\\":{\\"annotations\\":{\\"meta.helm.sh/release-name\\":\\"open-webui\\",\\"meta.helm.sh/release-namespace\\":\\"paperless\\"},\\"creationTimestamp\\":\\"2024-10-27T16:27:39Z\\",\\"generation\\":39,\\"labels\\":{\\"app.kubernetes.io/component\\":\\"open-webui\\",\\"app.kubernetes.io/instance\\":\\"open-webui\\",\\"app.kubernetes.io/managed-by\\":\\"Helm\\",\\"app.kubernetes.io/name\\":\\"open-webui\\",\\"app.kubernetes.io/version\\":\\"0.8.12\\",\\"helm.sh/chart\\":\\"open-webui-12.13.0\\",\\"helm.toolkit.fluxcd.io/name\\":\\"open-webui\\",\\"helm.toolkit.fluxcd.io/namespace\\":\\"paperless\\"},\\"managedFields\\":[{\\"manager\\":\\"helm-controller\\",\\"operation\\":\\"Update\\",\\"apiVersion\\":\\"apps/v1\\",\\"time\\":\\"2026-03-28T10:17:13Z\\",\\"fieldsType\\":\\"FieldsV1\\"}],\\"name\\":\\"open-webui\\",\\"namespace\\":\\"paperless\\",\\"resourceVersion\\":\\"68921028\\",\\"uid\\":\\"3fa38c3a-5b4b-4698-8e60-38368d70043a\\"},\\"spec\\":{},\\"status\\":{}": json: cannot unmarshal bool into Go struct field EnvVar.spec.template.spec.containers.env.value of type string'`

    const result = parseErrorMessage(message)

    expect(result.isComplex).toBe(true)
    expect(result.summary).toContain("Helm upgrade failed")
    expect(result.actualError).toContain("cannot unmarshal bool")
    expect(result.embeddedJson).toBeDefined()
  })

  it("should handle simple error messages", () => {
    const message = "Simple error message"

    const result = parseErrorMessage(message)

    expect(result.isComplex).toBe(false)
    expect(result.summary).toBe("Simple error message")
    expect(result.embeddedJson).toBeUndefined()
  })

  it("should extract validation error from complex JSON errors", () => {
    const message = `Error: patch: Invalid value: "{}": json: cannot unmarshal bool into Go struct field EnvVar.spec.template.spec.containers.env.value of type string`

    const result = parseErrorMessage(message)

    expect(result.actualError).toContain("cannot unmarshal bool")
    expect(result.actualError).toContain("EnvVar")
  })

  it("should generate short summary for table display", () => {
    const longMessage = "A".repeat(200)
    const summary = getSummaryMessage(longMessage, 50)

    expect(summary.length).toBeLessThanOrEqual(53) // 50 + '...'
    expect(summary).toContain("...")
  })

  it("should handle multi-line error messages", () => {
    const message = `First line of error
Second line of error
Third line`

    const result = parseErrorMessage(message)

    expect(result.isComplex).toBe(true)
  })

  it("should extract actual error from kubectl validation errors", () => {
    const message = `Error from server: admission webhook "validate.example.com" denied the request: Invalid value: "bad-value": field is invalid: must match pattern`

    const result = parseErrorMessage(message)

    expect(result.actualError).toContain("field is invalid")
  })
})
