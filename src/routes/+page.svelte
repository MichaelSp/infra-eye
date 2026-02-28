<script lang="ts">
import DropdownFilters from "$lib/components/DropdownFilters.svelte"
import EmptyState from "$lib/components/EmptyState.svelte"
import LoadingSpinner from "$lib/components/LoadingSpinner.svelte"
import ResourceTable from "$lib/components/ResourceTable.svelte"
import SummaryCards from "$lib/components/SummaryCards.svelte"
import type { ResourceStore } from "$lib/stores/k8s-resources"
import {
  createK8sResourceStore,
  type K8sResource
} from "$lib/stores/k8s-resources"
import { Button, TabItem, Tabs } from "flowbite-svelte"
import { derived, writable, type Readable } from "svelte/store"

let { data } = $props()

// Configure which resources to watch
const resourceStores: Readable<ResourceStore>[] = [
  createK8sResourceStore("helmreleases.helm.toolkit.fluxcd.io"),
  createK8sResourceStore("kustomizations.kustomize.toolkit.fluxcd.io"),
  createK8sResourceStore("helmcharts.source.toolkit.fluxcd.io"),
  createK8sResourceStore("helmrepositories.source.toolkit.fluxcd.io")
  //createK8sResourceStore("gitrepositories.source.toolkit.fluxcd.io")
]

// Combine all resources into a single store
const allResources = derived(resourceStores, (stores) => {
  const resources: K8sResource[] = []
  stores.forEach((store) => {
    resources.push(...Array.from(store.resources.values()))
  })
  return resources
})

// Connection status - check if any connection has an error or is disconnected
const connectionStatus = derived(resourceStores, (stores) => {
  const statuses = stores.map((s) => s.status)
  const errors = stores.map((s) => s.error).filter((e) => e !== null)

  if (statuses.includes("connecting"))
    return { status: "connecting" as const, errors }
  if (statuses.includes("error")) return { status: "error" as const, errors }
  if (statuses.every((s) => s === "connected"))
    return { status: "connected" as const, errors }
  return { status: "disconnected" as const, errors }
})

// Filter state
const kindFilter = writable("all")
const namespaceFilter = writable("all")
const statusFilter = writable("All statuses")
const searchQuery = writable("")

// Get unique kinds for filter dropdown
const kinds = derived(allResources, ($all) => {
  const uniqueKinds = new Set($all.map((r) => r.kind))
  return ["all", ...Array.from(uniqueKinds).sort()]
})

// Get unique namespaces for filter dropdown
const namespaces = derived(allResources, ($all) => {
  const uniqueNamespaces = new Set(
    $all.map((r) => r.metadata.namespace).filter(Boolean) as string[]
  )
  return ["all", ...Array.from(uniqueNamespaces).sort()]
})

// Helper to get resource status
function getResourceStatus(resource: K8sResource): string {
  const conditions = resource.status?.conditions || []
  const readyCondition = conditions.find((c: any) => c.type === "Ready")

  if (resource.spec?.suspend === true) return "Suspended"
  if (readyCondition?.status === "True") return "Ready"
  if (readyCondition?.status === "False") return "NotReady"
  return "Progressing"
}

// Filtered resources based on all filters
const filtered = derived(
  [allResources, kindFilter, namespaceFilter, statusFilter, searchQuery],
  ([$all, $kf, $nf, $sf, $sq]) => {
    let result = $all

    // Filter by kind
    if ($kf !== "all") {
      result = result.filter((r) => r.kind === $kf)
    }

    // Filter by namespace
    if ($nf !== "all") {
      result = result.filter((r) => r.metadata.namespace === $nf)
    }

    // Filter by status
    if ($sf !== "All statuses") {
      result = result.filter((r) => getResourceStatus(r) === $sf)
    }

    // Filter by search query
    if ($sq.trim()) {
      const query = $sq.toLowerCase()
      result = result.filter(
        (r) =>
          r.metadata.name.toLowerCase().includes(query) ||
          r.kind.toLowerCase().includes(query) ||
          r.metadata.namespace?.toLowerCase().includes(query)
      )
    }

    return result
  }
)

// Active tab
let activeTab = $state("resources")

// Clear all filters
function clearFilters() {
  kindFilter.set("all")
  namespaceFilter.set("all")
  statusFilter.set("All statuses")
  searchQuery.set("")
}
</script>

<svelte:head>
	<title>Infra Eye — GitOps Dashboard</title>
	<meta name="description" content="Real-time GitOps dashboard for Flux resources" />
</svelte:head>

<main class="px-8 py-6 max-w-7xl mx-auto">
	{#if $connectionStatus.status === "connecting"}
		<LoadingSpinner message="Connecting to Kubernetes cluster..." />
	{:else if $allResources.length === 0}
		<EmptyState kindFilter={$kindFilter} />
	{:else}
		<!-- Summary Cards -->
		<div class="mb-6">
			<SummaryCards resources={$allResources} {kindFilter} {statusFilter} />
		</div>

		<!-- Tabs -->
		<div class="mb-6 bg-white rounded-lg">
			<Tabs style="underline" class="bg-white">
				<TabItem open={activeTab === "resources"} title="Resource List" onclick={() => activeTab = "resources"}>
					<!-- Filters -->
					<div class="mt-6 mb-6">
						<DropdownFilters
							kinds={$kinds}
							namespaces={$namespaces}
							{kindFilter}
							{namespaceFilter}
							{statusFilter}
							{searchQuery}
						/>
						<div class="mt-3 flex justify-end">
							<Button color="alternative" size="sm" onclick={clearFilters}>
								Clear Filters
							</Button>
						</div>
					</div>

					<!-- Resource Table -->
					{#if $filtered.length === 0}
						<div class="text-center py-12 ">
							<p class="text-lg mb-2">No resources found</p>
							<p class="text-sm">Try adjusting your filters or search query</p>
						</div>
					{:else}
						<ResourceTable resources={$filtered} />
					{/if}
				</TabItem>
				
				<TabItem open={activeTab === "topology"} title="Topology Graph" onclick={() => activeTab = "topology"}>
					<div class="text-center py-12 ">
						<p class="text-lg mb-2">Topology Graph</p>
						<p class="text-sm">Coming soon...</p>
					</div>
				</TabItem>
			</Tabs>
		</div>
	{/if}
</main>