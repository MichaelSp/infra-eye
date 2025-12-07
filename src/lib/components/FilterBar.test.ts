import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { writable } from "svelte/store";
import { describe, expect, it } from "vitest";
import FilterBar from "./FilterBar.svelte";

describe("FilterBar", () => {
  it("renders all kinds with counts", () => {
    const kindFilter = writable("all");
    const kinds = ["all", "HelmRelease", "Kustomization", "GitRepository"];
    const resourceCounts = new Map([
      ["HelmRelease", 5],
      ["Kustomization", 3],
      ["GitRepository", 2],
    ]);

    render(FilterBar, {
      props: {
        kinds,
        kindFilter,
        resourceCounts,
        totalCount: 10,
      },
    });

    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("HelmRelease")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Kustomization")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("GitRepository")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("highlights selected filter", () => {
    const kindFilter = writable("HelmRelease");
    const kinds = ["all", "HelmRelease", "Kustomization"];
    const resourceCounts = new Map([
      ["HelmRelease", 5],
      ["Kustomization", 3],
    ]);

    const { container } = render(FilterBar, {
      props: {
        kinds,
        kindFilter,
        resourceCounts,
        totalCount: 8,
      },
    });

    // Find the HelmRelease button
    const helmButton = screen.getByText("HelmRelease").closest("button");
    expect(helmButton).toHaveClass("bg-blue-600");
  });

  it("updates store when filter is clicked", async () => {
    const user = userEvent.setup();
    const kindFilter = writable("all");
    const kinds = ["all", "HelmRelease", "Kustomization"];
    const resourceCounts = new Map([
      ["HelmRelease", 5],
      ["Kustomization", 3],
    ]);

    render(FilterBar, {
      props: {
        kinds,
        kindFilter,
        resourceCounts,
        totalCount: 8,
      },
    });

    const helmButton = screen.getByText("HelmRelease").closest("button");
    await user.click(helmButton!);

    // Check if store was updated
    let currentValue: string = "";
    kindFilter.subscribe((val) => (currentValue = val))();
    expect(currentValue).toBe("HelmRelease");
  });

  it("handles zero counts gracefully", () => {
    const kindFilter = writable("all");
    const kinds = ["all", "HelmRelease"];
    const resourceCounts = new Map();

    render(FilterBar, {
      props: {
        kinds,
        kindFilter,
        resourceCounts,
        totalCount: 0,
      },
    });

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it('does not render "all" in the kinds list', () => {
    const kindFilter = writable("all");
    const kinds = ["all", "HelmRelease", "Kustomization"];
    const resourceCounts = new Map([
      ["HelmRelease", 5],
      ["Kustomization", 3],
    ]);

    render(FilterBar, {
      props: {
        kinds,
        kindFilter,
        resourceCounts,
        totalCount: 8,
      },
    });

    // Should only have one "All" button (not two)
    const allButtons = screen.getAllByText("All");
    expect(allButtons).toHaveLength(1);
  });
});
