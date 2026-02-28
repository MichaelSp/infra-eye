<script lang="ts">
import type { K8sResource } from "$lib/stores/k8s-resources";
import { Badge, Button, ButtonGroup, Modal } from "flowbite-svelte";
import {
  ArrowsRepeatOutline,
  ChevronDownOutline,
  ChevronUpOutline,
  ChevronLeftOutline,
  ChevronRightOutline,
  ClockOutline,
  CodeOutline,
  ExclamationCircleOutline,
  LinkOutline
} from "flowbite-svelte-icons";
import yaml from "js-yaml";
import { createEventDispatcher } from "svelte";
import { formatTime, getSourceInfo } from "./utils";

export let resource: K8sResource
export let open: boolean
export let allResources: K8sResource[] = []

const dispatch = createEventDispatcher<{
  viewSource: {
    kind: string
    namespace: string
    name: string
  }
}>()

let showConditions = true
let showManifest = true
let isReconciling = false
let reconcileError: string | null = null
let reconcileSuccess = false

$: sourceInfo = getSourceInfo(resource)
$: readyCondition = resource.status?.conditions?.find(
  (c: any) => c.type === "Ready"
)
$: isReady = readyCondition?.status === "True"
$: statusText = readyCondition?.message || "Unknown"
$: conditions = resource.status?.conditions || []

$: lastReconcile = formatTime(
  resource.status?.lastHandledReconcileAt ||
    resource.status?.lastAppliedRevision ||
    resource.status?.artifact?.lastUpdateTime
)

// Determine if this resource has a clickable source reference
$: hasSourceReference = !!(sourceInfo.repo || sourceInfo.source)

// Get the actual source resource to show its status
$: sourceResource = hasSourceReference ? allResources.find(r => {
  const sourceName = sourceInfo.repo || sourceInfo.source
  const sourceKind = getSourceKind(resource)
  const sourceNamespace = getSourceNamespace(resource)
  return r.kind === sourceKind &&
         r.metadata.name === sourceName &&
         r.metadata.namespace === sourceNamespace
}) : undefined

$: sourceStatus = sourceResource ? getResourceStatus(sourceResource) : null

// Determine if this resource is a source type (GitRepository, HelmRepository, etc.)
$: isSourceType = ["GitRepository", "HelmRepository", "OCIRepository", "Bucket"].includes(resource.kind)

// Find resources that use this source
$: usages = isSourceType ? findResourcesUsingSource(resource, allResources) : []

function findResourcesUsingSource(source: K8sResource, resources: K8sResource[]): K8sResource[] {
  const sourceName = source.metadata.name
  const sourceNamespace = source.metadata.namespace
  const sourceKind = source.kind

  return resources.filter(res => {
    // Check HelmRelease references
    if (res.kind === "HelmRelease") {
      const ref = res.spec?.chart?.spec?.sourceRef
      if (!ref) return false

      const refNamespace = ref.namespace || res.metadata.namespace
      return ref.kind === sourceKind &&
             ref.name === sourceName &&
             refNamespace === sourceNamespace
    }

    // Check Kustomization references
    if (res.kind === "Kustomization") {
      const ref = res.spec?.sourceRef
      if (!ref) return false

      const refNamespace = ref.namespace || res.metadata.namespace
      return ref.kind === sourceKind &&
             ref.name === sourceName &&
             refNamespace === sourceNamespace
    }

    return false
  })
}

function getSourceKind(res: K8sResource): string | null {
  if (res.kind === "HelmRelease") {
    return res.spec?.chart?.spec?.sourceRef?.kind || null
  } else if (res.kind === "Kustomization") {
    return res.spec?.sourceRef?.kind || null
  }
  return null
}

function getSourceNamespace(res: K8sResource): string {
  // Check if sourceRef specifies a namespace
  if (res.kind === "HelmRelease") {
    const specifiedNs = res.spec?.chart?.spec?.sourceRef?.namespace
    if (specifiedNs) return specifiedNs
  } else if (res.kind === "Kustomization") {
    const specifiedNs = res.spec?.sourceRef?.namespace
    if (specifiedNs) return specifiedNs
  }

  // Default to resource's namespace, or flux-system if no namespace
  return res.metadata.namespace || "flux-system"
}

function getResourceStatus(res: K8sResource): {
  isReady: boolean
  color: string
  bgColor: string
} {
  const conditions = res.status?.conditions || []
  const readyCondition = conditions.find((c: any) => c.type === "Ready")

  if (res.spec?.suspend === true) {
    return {
      isReady: false,
      color: "text-slate-500",
      bgColor: "bg-slate-100 dark:bg-slate-800"
    }
  }

  if (readyCondition?.status === "True") {
    return {
      isReady: true,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-900/20"
    }
  }

  if (readyCondition?.status === "False") {
    return {
      isReady: false,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-900/20"
    }
  }

  return {
    isReady: false,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-900/20"
  }
}

// Parse apiVersion into group and version
function parseApiVersion(apiVersion: string | undefined): {
  group: string
  version: string
} {
  if (!apiVersion) {
    return { group: "", version: "v1" }
  }
  const parts = apiVersion.split("/")
  if (parts.length === 1) {
    return { group: "", version: parts[0] }
  }
  return { group: parts[0], version: parts[1] }
}

// Filter out noisy fields from the resource manifest
function filterResourceManifest(resource: K8sResource): any {
  const filtered = JSON.parse(JSON.stringify(resource))

  // Collapse managedFields - show it exists but hide the content
  if (filtered.metadata?.managedFields) {
    filtered.metadata.managedFields = `[${filtered.metadata.managedFields.length} entries collapsed]`
  }

  // Collapse last-applied-configuration annotation - show it exists but hide the content
  if (
    filtered.metadata?.annotations?.[
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

// Convert resource to YAML format
function resourceToYaml(resource: K8sResource): string {
  const filtered = filterResourceManifest(resource)
  return yaml.dump(filtered, {
    indent: 2,
    lineWidth: -1,
    noRefs: true
  })
}

async function triggerReconcile(force = false) {
  isReconciling = true
  reconcileError = null
  reconcileSuccess = false

  try {
    const { group, version } = parseApiVersion(resource.apiVersion)

    const payload = {
      namespace: resource.metadata.namespace,
      name: resource.metadata.name,
      kind: resource.kind,
      group,
      version,
      force
    }

    console.log("[Reconcile] Sending request:", payload)

    const response = await fetch("/api/reconcile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[Reconcile] Error response:", data)
      throw new Error(data.error || "Failed to trigger reconcile")
    }

    console.log("[Reconcile] Success:", data)
    reconcileSuccess = true
    setTimeout(() => {
      reconcileSuccess = false
    }, 3000)
  } catch (error: any) {
    console.error("[Reconcile] Exception:", error)
    reconcileError = error.message
    setTimeout(() => {
      reconcileError = null
    }, 5000)
  } finally {
    isReconciling = false
  }
}

function handleViewSource() {
  const sourceName = sourceInfo.repo || sourceInfo.source
  if (!sourceName) return

  const sourceKind = getSourceKind(resource)
  if (!sourceKind) return

  const sourceNamespace = getSourceNamespace(resource)

  dispatch("viewSource", {
    kind: sourceKind,
    namespace: sourceNamespace,
    name: sourceName
  })
}

function handleViewUsage(usage: K8sResource) {
  dispatch("viewSource", {
    kind: usage.kind,
    namespace: usage.metadata.namespace || "default",
    name: usage.metadata.name
  })
}
</script>

<Modal bind:open size="xl" class="">
	<svelte:fragment slot="header">
		<div class="flex items-center gap-2">
			<CodeOutline size="sm" />
			<span>{resource.metadata.name}</span>
			<Badge color={isReady ? "green" : "red"} class="text-xs">
				{isReady ? "Ready" : "Not Ready"}
			</Badge>
		</div>
	</svelte:fragment>

	<div class="flex gap-4 min-h-[600px]">
		<!-- Left Column: Metadata and Details -->
		<div class="flex-1 space-y-4 overflow-y-auto pr-4">
			<!-- Reconcile Actions -->
			<div class="border-b pb-4">
				<div class="flex items-center justify-between mb-3">
					<h4 class="text-sm font-semibold">Actions</h4>
					{#if reconcileSuccess}
						<span class="text-xs text-green-600">✓ Reconcile triggered successfully</span>
					{/if}
					{#if reconcileError}
						<span class="text-xs text-red-600">Error: {reconcileError}</span>
					{/if}
				</div>
				<div class="flex items-center justify-between">
					<ButtonGroup>
						<Button
							color="blue"
							disabled={isReconciling}
							onclick={() => triggerReconcile(false)}
						>
							<ArrowsRepeatOutline size="sm" class={isReconciling ? 'animate-spin' : ''} />
							{isReconciling ? 'Reconciling...' : 'Reconcile'}
						</Button>
						<Button
							color="purple"
							disabled={isReconciling}
							onclick={() => triggerReconcile(true)}
							class="whitespace-nowrap"
						>
							<ArrowsRepeatOutline size="sm" class={isReconciling ? 'animate-spin' : ''} />
							{isReconciling ? 'Reconciling...' : 'Force-Reconcile'}
						</Button>
					</ButtonGroup>
					<Button
						outline
						color="light"
						onclick={() => (showManifest = !showManifest)}
						class="ml-auto"
					>
						<span>YAML</span>
						{#if showManifest}
							<ChevronLeftOutline size="sm" />
						{:else}
							<ChevronRightOutline size="sm" />
						{/if}
					</Button>
				</div>
			</div>

			<!-- Metadata -->
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="">Kind:</span>
					<span class="ml-2 ">{resource.kind}</span>
				</div>
				<div>
					<span class="">Namespace:</span>
					<span class="ml-2 "
						>{resource.metadata.namespace || "default"}</span
					>
				</div>
				<div>
					<span class="">Created:</span>
					<span class="ml-2 "
						>{formatTime(resource.metadata.creationTimestamp)}</span
					>
				</div>
				<div>
					<span class="">Last Reconcile:</span>
					<span class="ml-2 ">{lastReconcile}</span>
				</div>
			</div>

		<!-- Source Information -->
		{#if hasSourceReference}
			<div class="border-t  pt-4">
				<div class="flex items-center justify-between mb-3">
					<h4 class="text-sm font-semibold">Source Information</h4>
					<Button
						size="xs"
						color="light"
						onclick={handleViewSource}
						class="flex items-center gap-1 {sourceStatus?.bgColor || ''}"
					>
						<LinkOutline size="xs" class={sourceStatus?.color || ""} />
						<span class={sourceStatus?.color || ""}>View Source</span>
					</Button>
				</div>
				<div class="space-y-2 text-sm">
					<div class="flex items-start">
						<span class=" w-24 shrink-0">{sourceInfo.type}:</span>
						<span class=" break-all">{sourceInfo.value}</span>
					</div>
					{#if sourceInfo.repo || sourceInfo.source}
						<div class="flex items-start">
							<span class=" w-24 shrink-0">Source Ref:</span>
							<span class="font-medium flex items-center gap-2">
								{sourceInfo.repo || sourceInfo.source}
								{#if sourceStatus}
									<span class="text-xs {sourceStatus.color}">
										{sourceStatus.isReady ? "✓" : "✗"}
									</span>
								{/if}
							</span>
						</div>
					{/if}
					{#if sourceInfo.version}
						<div class="flex items-start">
							<span class=" w-24 shrink-0">Version:</span>
							<span class="">{sourceInfo.version}</span>
						</div>
					{/if}
					{#if sourceInfo.branch}
						<div class="flex items-start">
							<span class=" w-24 shrink-0">Branch:</span>
							<span class="">{sourceInfo.branch}</span>
						</div>
					{/if}
					{#if sourceInfo.tag}
						<div class="flex items-start">
							<span class=" w-24 shrink-0">Tag:</span>
							<span class="">{sourceInfo.tag}</span>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Usages -->
		{#if isSourceType && usages.length > 0}
			<div class="border-t  pt-4">
				<h4 class="text-sm font-semibold mb-3">Used By ({usages.length})</h4>
				<div class="space-y-2">
					{#each usages as usage}
						{@const status = getResourceStatus(usage)}
						<button
							onclick={() => handleViewUsage(usage)}
							class="w-full flex items-center justify-between p-3 text-left rounded transition-colors border {status.bgColor}"
						>
							<div class="flex-1">
								<div class="font-medium text-sm  flex items-center gap-2">
									<span class={status.color}>
										{status.isReady ? "✓" : "✗"}
									</span>
									{usage.metadata.name}
								</div>
								<div class="text-xs text-gray-500">
									{usage.kind} • {usage.metadata.namespace}
								</div>
							</div>
							<LinkOutline size="sm" class="text-gray-400" />
						</button>
					{/each}
				</div>
			</div>
		{/if}

			<!-- Status Message -->
			{#if !isReady && statusText !== "Unknown"}
				<div class="flex items-start gap-2 p-3  rounded">
					<ExclamationCircleOutline
						size="sm"
						class="text-yellow-400 mt-0.5 shrink-0"
					/>
					<div>
						<div class="text-sm font-medium  mb-1">Status Message</div>
						<div class="text-sm ">{statusText}</div>
					</div>
				</div>
			{/if}

			<!-- Conditions -->
			<div class="border-t  pt-4">
				<button
					class="flex items-center justify-between w-full text-sm font-semibold mb-3 hover:"
					onclick={() => (showConditions = !showConditions)}
				>
					<span>Conditions ({conditions.length})</span>
					{#if showConditions}
						<ChevronUpOutline size="sm" />
					{:else}
						<ChevronDownOutline size="sm" />
					{/if}
				</button>

				{#if showConditions && conditions.length > 0}
					<div class="space-y-2">
						{#each conditions as condition}
							<div class="text-xs p-3 rounded ">
								<div class="flex items-center justify-between mb-2">
									<span class="font-medium ">{condition.type}</span>
									<Badge
										color={condition.status === "True" ? "green" : "red"}
										class="text-xs"
									>
										{condition.status}
									</Badge>
								</div>
								{#if condition.reason}
									<div class=" mb-1">Reason: {condition.reason}</div>
								{/if}
								{#if condition.message}
									<div class=" mb-1">{condition.message}</div>
								{/if}
								{#if condition.lastTransitionTime}
									<div class="flex items-center gap-1 ">
										<ClockOutline size="xs" />
										{formatTime(condition.lastTransitionTime)}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Column: YAML Manifest -->
		{#if showManifest}
			<div class="flex-1 border-l pl-4 flex flex-col min-w-0">
				<div class="flex-1 bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-auto min-h-0">
					<pre class="text-xs font-mono text-gray-100 whitespace-pre overflow-x-auto"><code>{resourceToYaml(resource)}</code></pre>
				</div>
			</div>
		{/if}
	</div>
</Modal>
