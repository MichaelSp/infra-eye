import { fireEvent, render, screen } from "@testing-library/svelte"
import { describe, expect, it, vi } from "vitest"

import SummaryCards from "./SummaryCards.svelte"

const resources = [
  {
    apiVersion: "kustomize.toolkit.fluxcd.io/v1",
    kind: "Kustomization",
    metadata: {
      name: "app-config",
      namespace: "flux-system"
    },
    status: {
      conditions: [
        {
          type: "Ready",
          status: "True"
        }
      ]
    }
  },
  {
    apiVersion: "helm.toolkit.fluxcd.io/v2",
    kind: "HelmRelease",
    metadata: {
      name: "backend",
      namespace: "flux-system"
    },
    status: {
      conditions: [
        {
          type: "Ready",
          status: "False"
        }
      ]
    }
  }
]

describe("SummaryCards", () => {
  it("only renders cards for kinds that have resources", () => {
    render(SummaryCards, {
      props: {
        resources,
        kindFilter: "all",
        statusFilter: "All statuses"
      }
    })

    expect(screen.getByText("Kustomizations")).toBeInTheDocument()
    expect(screen.getByText("HelmReleases")).toBeInTheDocument()
    expect(screen.queryByText("GitRepositorys")).not.toBeInTheDocument()
    expect(screen.queryByText("HelmCharts")).not.toBeInTheDocument()
  })

  it("tints ready and failing kinds differently", () => {
    render(SummaryCards, {
      props: {
        resources,
        kindFilter: "all",
        statusFilter: "All statuses"
      }
    })

    const readyCard = screen.getByText("Kustomizations").closest('[role="button"]')
    const failingCard = screen.getByText("HelmReleases").closest('[role="button"]')

    expect(readyCard).toHaveClass("bg-green-50", "border-green-200")
    expect(failingCard).toHaveClass("bg-red-50", "border-red-200")
  })

  it("sets the kind filter when clicking a card", async () => {
    const onFilterChange = vi.fn()

    render(SummaryCards, {
      props: {
        resources,
        kindFilter: "all",
        statusFilter: "All statuses",
        onFilterChange
      }
    })

    await fireEvent.click(screen.getByText("Kustomizations"))

    expect(onFilterChange).toHaveBeenCalledWith("Kustomization", "All statuses")
  })

  it("preserves the kind filter when clicking a status count", async () => {
    const onFilterChange = vi.fn()
    const { container } = render(SummaryCards, {
      props: {
        resources,
        kindFilter: "all",
        statusFilter: "All statuses",
        onFilterChange
      }
    })

    const readyStatusButtons = Array.from(container.querySelectorAll('[role="button"]')).filter(
      (element) => element.className.includes("text-green-600")
    )

    await fireEvent.click(readyStatusButtons[0])

    expect(onFilterChange).toHaveBeenCalledWith("Kustomization", "Ready")
    expect(onFilterChange).toHaveBeenCalledTimes(1)
  })
})