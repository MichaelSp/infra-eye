<script lang="ts">
import FluxCard from "$lib/FluxCard.svelte";
import ConnectionStatus from "$lib/components/ConnectionStatus.svelte";
import EmptyState from "$lib/components/EmptyState.svelte";
import FilterBar from "$lib/components/FilterBar.svelte";
import LoadingSpinner from "$lib/components/LoadingSpinner.svelte";
import type { ResourceStore } from "$lib/stores/k8s-resources";
import {
  createK8sResourceStore,
  type K8sResource
} from "$lib/stores/k8s-resources";
import { signOut } from "@auth/sveltekit/client";
import { Button } from "flowbite-svelte";
import { ArrowRightToBracketOutline } from "flowbite-svelte-icons";
import { derived, writable, type Readable } from "svelte/store";

let { data } = $props()

async function handleLogout() {
  await signOut({ redirectTo: "/login" })
}

// Configure which resources to watch
const resourceStores: Readable<ResourceStore>[] = [
  createK8sResourceStore("helmreleases.helm.toolkit.fluxcd.io"),
  createK8sResourceStore("kustomizations.kustomize.toolkit.fluxcd.io"),
  createK8sResourceStore("ocirepositories.source.toolkit.fluxcd.io")
  // createK8sResourceStore("gitrepositories.source.toolkit.fluxcd.io")
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

// Get unique kinds for filter dropdown
const kinds = derived(allResources, ($all) => {
  const uniqueKinds = new Set($all.map((r) => r.kind))
  return ["all", ...Array.from(uniqueKinds).sort()]
})

// Filtered resources based on selected kind
const filtered = derived([allResources, kindFilter], ([$all, $kf]) =>
  $kf === "all" ? $all : $all.filter((r) => r.kind === $kf)
)

// Resource count by type
const resourceCounts = derived(allResources, ($all) => {
  const counts = new Map<string, number>()
  $all.forEach((r) => {
    counts.set(r.kind, (counts.get(r.kind) || 0) + 1)
  })
  return counts
})

function resourceKey(r: K8sResource) {
  return r.metadata.namespace
    ? `${r.kind}/${r.metadata.namespace}/${r.metadata.name}`
    : `${r.kind}/${r.metadata.name}`
}
</script>

<svelte:head>
	<title>Infra Eye — GitOps Dashboard</title>
	<meta name="description" content="Real-time GitOps dashboard for Flux resources" />
</svelte:head>

<header class="px-6 py-5 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-sm">
	<div class="max-w-7xl mx-auto">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
					Infra Eye — GitOps Dashboard
				</h1>
				<p class="text-sm text-slate-400 mt-1.5">
					Real-time Kubernetes Flux resources monitoring
				</p>
			</div>

			<div class="flex items-center gap-4">
				<ConnectionStatus
					status={$connectionStatus.status}
					errors={$connectionStatus.errors}
				/>
				
				{#if data.session?.user}
					<div class="flex items-center gap-3">
						<div class="text-sm text-slate-300">
							<div class="font-medium">{data.session.user.name || data.session.user.email}</div>
						</div>
						<Button size="xs" color="alternative" on:click={handleLogout}>
							<ArrowRightToBracketOutline size="xs" class="mr-1" />
							Logout
						</Button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Filter Tabs -->
		<div class="mt-5">
			<FilterBar
				kinds={$kinds}
				{kindFilter}
				resourceCounts={$resourceCounts}
				totalCount={$allResources.length}
			/>
		</div>
	</div>
</header>

<main class="p-6 max-w-7xl mx-auto">
	{#if $connectionStatus.status === "connecting"}
		<LoadingSpinner message="Connecting to Kubernetes cluster..." />
	{:else if $filtered.length === 0}
		<EmptyState kindFilter={$kindFilter} />
	{:else}
		<section class="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
			{#each $filtered as r (resourceKey(r))}
				<FluxCard resource={r} />
			{/each}
		</section>
	{/if}
</main>
