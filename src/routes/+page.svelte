<script lang="ts">
import DropdownFilters from "$lib/components/DropdownFilters.svelte";
import EmptyState from "$lib/components/EmptyState.svelte";
import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
import ResourceTable from "$lib/components/ResourceTable.svelte";
import SummaryCards from "$lib/components/SummaryCards.svelte";
import {
  clearFilters as clearFilterState,
  filterState
} from "$lib/state/filters.svelte";
import type { ResourceStore } from "$lib/stores/k8s-resources";
import {
  createK8sResourceStore,
  type K8sResource
} from "$lib/stores/k8s-resources";
import { Button, TabItem, Tabs } from "flowbite-svelte";
import { derived, type Readable } from "svelte/store";

let { data } = $props()

// Configure which resources to watch
const resourceStores: Readable<ResourceStore>[] = [
  createK8sResourceStore("helmreleases.helm.toolkit.fluxcd.io"),
  createK8sResourceStore("kustomizations.kustomize.toolkit.fluxcd.io"),
  createK8sResourceStore("helmcharts.source.toolkit.fluxcd.io"),
  createK8sResourceStore("helmrepositories.source.toolkit.fluxcd.io"),
  createK8sResourceStore("gitrepositories.source.toolkit.fluxcd.io")
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

// Get unique kinds for filter dropdown using $derived
const kinds = $derived.by(() => {
  const uniqueKinds = new Set($allResources.map((r) => r.kind))
  return ["all", ...Array.from(uniqueKinds).sort()]
})

// Get unique namespaces for filter dropdown using $derived
const namespaces = $derived.by(() => {
  const uniqueNamespaces = new Set(
    $allResources.map((r) => r.metadata.namespace).filter(Boolean) as string[]
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

// Filtered resources based on all filters using $derived
const filtered = $derived.by(() => {
  let result = $allResources

  // Filter by kind
  if (filterState.kind !== "all") {
    result = result.filter((r) => r.kind === filterState.kind)
  }

  // Filter by namespace
  if (filterState.namespace !== "all") {
    result = result.filter(
      (r) => r.metadata.namespace === filterState.namespace
    )
  }

  // Filter by status
  if (filterState.status !== "All statuses") {
    result = result.filter((r) => getResourceStatus(r) === filterState.status)
  }

  // Filter by search query
  if (filterState.search.trim()) {
    const query = filterState.search.toLowerCase()
    result = result.filter(
      (r) =>
        r.metadata.name.toLowerCase().includes(query) ||
        r.kind.toLowerCase().includes(query) ||
        r.metadata.namespace?.toLowerCase().includes(query)
    )
  }

  return result
})

// Active tab
let activeTab = $state("resources")
</script>

<svelte:head>
	<title>Infra Eye — GitOps Dashboard</title>
	<meta name="description" content="Real-time GitOps dashboard for Flux resources" />
</svelte:head>

<main class="px-8 py-6 max-w-7xl mx-auto">
	{#if $connectionStatus.status === "connecting"}
		<LoadingSpinner message="Connecting to Kubernetes cluster..." />
	{:else if $allResources.length === 0}
		<EmptyState kindFilter={filterState.kind} />
	{:else}
		<!-- Summary Cards -->
		<div class="mb-6">
			<SummaryCards
				resources={$allResources}
				kindFilter={filterState.kind}
				statusFilter={filterState.status}
				onFilterChange={(kind, status) => {
					filterState.kind = kind
					filterState.status = status
				}}
			/>
		</div>

		<!-- Tabs -->
		<div class="mb-6 bg-white rounded-lg">
			<Tabs style="underline" class="bg-white">
				<TabItem open={activeTab === "resources"} title="Resource List" onclick={() => activeTab = "resources"}>
					<!-- Filters -->
					<div class="mt-6 mb-6">
						<DropdownFilters
							kinds={kinds}
							namespaces={namespaces}
							kindFilter={filterState.kind}
							namespaceFilter={filterState.namespace}
							statusFilter={filterState.status}
							searchQuery={filterState.search}
							onUpdate={(filters) => {
								filterState.kind = filters.kind
								filterState.namespace = filters.namespace
								filterState.status = filters.status
								filterState.search = filters.search
							}}
						/>
						<div class="mt-3 flex justify-end">
							<Button color="alternative" size="sm" onclick={clearFilterState}>
								Clear Filters
							</Button>
						</div>
					</div>

					<!-- Resource Table -->
					{#if filtered.length === 0}
						<div class="text-center py-6 ">
							<p class="text-lg mb-2">No resources found</p>
							<p class="text-sm">Try adjusting your filters or search query</p>
						</div>
					{/if}
					<ResourceTable resources={filtered} allResources={$allResources} />
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