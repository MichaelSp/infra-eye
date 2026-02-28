import type { K8sResource } from "$lib/stores/k8s-resources"
import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import FluxDetailsModal from "./FluxDetailsModal.svelte"

describe("FluxDetailsModal", () => {
  const mockResource: K8sResource = {
    apiVersion: "helm.toolkit.fluxcd.io/v2beta1",
    kind: "HelmRelease",
    metadata: {
      name: "test-release",
      namespace: "default",
      creationTimestamp: "2024-01-01T00:00:00Z" as any,
      managedFields: [
        { manager: "test", operation: "Update", time: "2024-01-01T00:00:00Z" }
      ] as any,
      annotations: {
        "kubectl.kubernetes.io/last-applied-configuration":
          '{"apiVersion":"v1","kind":"test"}'
      }
    },
    spec: {
      chart: {
        spec: {
          sourceRef: {
            name: "my-repo",
            kind: "HelmRepository"
          },
          chart: "nginx",
          version: "1.0.0"
        }
      }
    },
    status: {
      conditions: [
        {
          type: "Ready",
          status: "True",
          reason: "ReconciliationSucceeded",
          message: "Release reconciliation succeeded",
          lastTransitionTime: "2024-01-01T00:10:00Z"
        }
      ],
      lastHandledReconcileAt: "2024-01-01T00:10:00Z"
    }
  }

  it("renders resource name in header", () => {
    const { container } = render(FluxDetailsModal, {
      props: { resource: mockResource, open: true }
    })

    // Check if the resource name appears in the YAML manifest
    expect(screen.getByText(/name: test-release/)).toBeInTheDocument()
  })

  it("displays ready status badge", () => {
    const { container } = render(FluxDetailsModal, {
      props: { resource: mockResource, open: true }
    })

    // Check that the conditions section exists and shows the status
    expect(screen.getByText("Conditions (1)")).toBeInTheDocument()
  })

  it("displays not ready status badge for failed resource", () => {
    const failedResource: K8sResource = {
      ...mockResource,
      status: {
        conditions: [
          {
            type: "Ready",
            status: "False",
            reason: "InstallFailed",
            message: "Installation failed"
          }
        ]
      }
    }

    const { container } = render(FluxDetailsModal, {
      props: { resource: failedResource, open: true }
    })

    // Check for the failure status message (appears in both conditions section and YAML)
    const messages = screen.getAllByText("Installation failed")
    expect(messages.length).toBeGreaterThan(0)
  })

  it("renders metadata fields", () => {
    render(FluxDetailsModal, { props: { resource: mockResource, open: true } })

    expect(screen.getByText("Kind:")).toBeInTheDocument()
    expect(screen.getByText("HelmRelease")).toBeInTheDocument()
    expect(screen.getByText("Namespace:")).toBeInTheDocument()
    expect(screen.getByText("default")).toBeInTheDocument()
  })

  it("renders reconcile action buttons", () => {
    render(FluxDetailsModal, { props: { resource: mockResource, open: true } })

    expect(screen.getByText("Reconcile")).toBeInTheDocument()
    expect(screen.getByText("Force-Reconcile")).toBeInTheDocument()
    expect(screen.getByText("Actions")).toBeInTheDocument()
  })

  it("renders YAML toggle button", () => {
    render(FluxDetailsModal, { props: { resource: mockResource, open: true } })

    expect(screen.getByText("YAML")).toBeInTheDocument()
  })

  it("displays YAML manifest by default", () => {
    render(FluxDetailsModal, { props: { resource: mockResource, open: true } })

    // Check for YAML format (key: value)
    expect(
      screen.getByText(/apiVersion: helm.toolkit.fluxcd.io\/v2beta1/)
    ).toBeInTheDocument()
    expect(screen.getByText(/kind: HelmRelease/)).toBeInTheDocument()
  })

  it("collapses noisy managedFields in YAML output", () => {
    render(FluxDetailsModal, { props: { resource: mockResource, open: true } })

    // Should show collapsed placeholder instead of full content
    expect(screen.getByText(/\[1 entries collapsed\]/)).toBeInTheDocument()
  })

  it("collapses noisy last-applied-configuration annotation in YAML output", () => {
    render(FluxDetailsModal, { props: { resource: mockResource, open: true } })

    // Should show collapsed placeholder instead of full JSON
    expect(screen.getByText(/\[.*chars collapsed\]/)).toBeInTheDocument()
  })

  it("toggles YAML manifest visibility when button is clicked", async () => {
    const user = userEvent.setup()
    const { container } = render(FluxDetailsModal, {
      props: { resource: mockResource, open: true }
    })

    const yamlButton = screen.getByText("YAML").closest("button")
    expect(yamlButton).toBeInTheDocument()

    // YAML should be visible by default
    expect(
      screen.getByText(/apiVersion: helm.toolkit.fluxcd.io\/v2beta1/)
    ).toBeInTheDocument()

    // Click to hide
    if (yamlButton) {
      await user.click(yamlButton)
    }

    // YAML should be hidden (no longer in document)
    expect(
      screen.queryByText(/apiVersion: helm.toolkit.fluxcd.io\/v2beta1/)
    ).not.toBeInTheDocument()
  })

  it("displays YAML in editor-like styling", () => {
    const { container } = render(FluxDetailsModal, {
      props: { resource: mockResource, open: true }
    })

    // Check for editor-like classes
    const yamlContainer = container.querySelector(".bg-gray-900")
    expect(yamlContainer).toBeInTheDocument()

    const preElement = container.querySelector("pre.font-mono")
    expect(preElement).toBeInTheDocument()
  })
})
