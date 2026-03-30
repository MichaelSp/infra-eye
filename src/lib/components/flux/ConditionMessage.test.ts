import { render } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import ConditionMessage from "./ConditionMessage.svelte"

describe("ConditionMessage.svelte", () => {
  it("should render simple message without details", () => {
    const { container } = render(ConditionMessage, {
      props: {
        message: "Simple error message"
      }
    })

    expect(container.textContent).toContain("Simple error message")
    expect(container.querySelector("button")).toBeNull()
  })

  it("should render complex message with expandable details", () => {
    const message =
      'Helm upgrade failed: cannot patch "test" with kind StatefulSet: "" is invalid: patch: Invalid value: "{\\"test\\":\\"value\\"}": json: cannot unmarshal bool'

    const { container } = render(ConditionMessage, {
      props: {
        message
      }
    })

    expect(container.textContent).toContain("Helm upgrade failed")
    expect(container.textContent).toContain("cannot unmarshal bool")

    // Should have expandable button
    const button = container.querySelector("button")
    expect(button).toBeTruthy()
    expect(button?.textContent).toContain("Expand Request Details")
  })

  it("should render manifest viewer with expand toggle", () => {
    const message =
      'cannot patch: patch: Invalid value: "{\\"apiVersion\\":\\"apps/v1\\",\\"kind\\":\\"StatefulSet\\"}": json error'

    const { container } = render(ConditionMessage, {
      props: {
        message
      }
    })

    expect(container.textContent).toContain("Expand Request Details")
    expect(container.querySelector("pre")).toBeTruthy()
  })

  it("should highlight validation error in red box", () => {
    const message =
      'cannot patch: patch: Invalid value: "{\\"test\\":\\"x\\"}": json: cannot unmarshal bool into Go struct field'

    const { container } = render(ConditionMessage, {
      props: {
        message
      }
    })

    // Should have error highlight
    const errorBox = container.querySelector(".bg-red-50")
    expect(errorBox).toBeTruthy()
    expect(errorBox?.textContent).toContain("❌")
    expect(errorBox?.textContent).toContain("cannot unmarshal bool")
  })
})
