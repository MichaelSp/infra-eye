<script lang="ts">
import FluxDetailsModal from "$lib/components/flux/FluxDetailsModal.svelte"
import type { K8sResource } from "$lib/stores/k8s-resources"
import { Badge } from "flowbite-svelte"

interface Props {
  resources: K8sResource[]
  allResources?: K8sResource[]
}

let { resources, allResources = resources }: Props = $props()

let selectedResource = $state<K8sResource | null>(null)
let showModal = $state(false)

// Keep selectedResource in sync with updated resources when modal is open
$effect(() => {
  if (showModal && selectedResource) {
    const currentSelection = selectedResource

    // Find the updated version of the selected resource
    const updated = resources.find(
      (r) =>
        r.kind === currentSelection.kind &&
        r.metadata.namespace === currentSelection.metadata.namespace &&
        r.metadata.name === currentSelection.metadata.name
    )
    // Update if found and resourceVersion changed (indicates K8s modification)
    if (
      updated &&
      updated.metadata.resourceVersion !==
        currentSelection.metadata.resourceVersion
    ) {
      selectedResource = updated
    }
  }
})

function getResourceStatus(resource: K8sResource): {
  status: string
  color?: "red" | "green" | "yellow" | "blue" | "indigo" | "purple" | "pink"
  customClass?: string
} {
  const conditions = resource.status?.conditions || []
  const readyCondition = conditions.find((c: any) => c.type === "Ready")

  if (resource.spec?.suspend === true) {
    return {
      status: "Suspended",
      customClass: " text-slate-700"
    }
  }

  if (readyCondition?.status === "True") {
    return {
      status: "Ready",
      customClass: "bg-black text-white"
    }
  }

  if (readyCondition?.status === "False") {
    return { status: "NotReady", color: "red" }
  }

  return {
    status: "Progressing",
    customClass: "bg-amber-50 text-amber-900"
  }
}

function getStatusMessage(resource: K8sResource): string {
  const conditions = resource.status?.conditions || []
  const readyCondition = conditions.find((c: any) => c.type === "Ready")
  return readyCondition?.message || "-"
}

function handleRowClick(resource: K8sResource) {
  selectedResource = resource
  showModal = true
}

function handleViewSource(
  event: CustomEvent<{ kind: string; namespace: string; name: string }>
) {
  const { kind, namespace, name } = event.detail

  // Find the source resource from the full dataset (not just filtered rows)
  const sourceResource = allResources.find(
    (r) =>
      r.kind === kind &&
      r.metadata.namespace === namespace &&
      r.metadata.name === name
  )

  if (sourceResource) {
    // Open the modal with the source resource
    selectedResource = sourceResource
    showModal = true
  } else {
    console.warn(`Source resource not found: ${kind} ${namespace}/${name}`)
  }
}
</script>

<div class="bg-white border  rounded-lg overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm text-left">
      <thead class="text-xs  uppercase  border-b ">
        <tr>
          <th class="px-6 py-3 font-medium">Kind</th>
          <th class="px-6 py-3 font-medium">Namespace</th>
          <th class="px-6 py-3 font-medium">Name</th>
          <th class="px-6 py-3 font-medium">Status</th>
          <th class="px-6 py-3 font-medium">Message</th>
        </tr>
      </thead>
      <tbody>
        {#each resources as resource, i}
          {@const { status, color, customClass } = getResourceStatus(resource)}
          {@const message = getStatusMessage(resource)}
          <tr 
            class="border-b  hover: cursor-pointer transition-colors"
            onclick={() => handleRowClick(resource)}
          >
            <td class="px-6 py-3 font-medium ">
              {resource.kind}
            </td>
            <td class="px-6 py-3 ">
              {resource.metadata.namespace || "-"}
            </td>
            <td class="px-6 py-3 ">
              {resource.metadata.name}
            </td>
            <td class="px-6 py-3">
              <Badge {color} class={customClass ? `${customClass} font-medium` : "font-medium"}>
                {status}
              </Badge>
            </td>
            <td class="px-6 py-3  max-w-md truncate">
              {message}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

{#if selectedResource}
  <FluxDetailsModal
    resource={selectedResource}
    bind:open={showModal}
    on:viewSource={handleViewSource}
    allResources={allResources}
  />
{/if}