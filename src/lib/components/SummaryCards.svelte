<script lang="ts">
import type { K8sResource } from "$lib/stores/k8s-resources";
import {
  CheckCircleSolid,
  ClockSolid,
  ExclamationCircleSolid,
  PauseSolid
} from "flowbite-svelte-icons";

interface Props {
  resources: K8sResource[]
  kindFilter: string
  statusFilter: string
  onFilterChange?: (kind: string, status: string) => void
}

let { resources, kindFilter, statusFilter, onFilterChange }: Props = $props()

interface StatusCounts {
  ready: number
  notReady: number
  progressing: number
  suspended: number
}

// Only show these specific resource types
const displayedKinds = ["Kustomization", "HelmRelease", "HelmChart", "GitRepository", "HelmRepository"]

function getResourceStatus(resource: K8sResource): string {
  const conditions = resource.status?.conditions || []
  const readyCondition = conditions.find((c: any) => c.type === "Ready")

  if (resource.spec?.suspend === true) return "Suspended"
  if (readyCondition?.status === "True") return "Ready"
  if (readyCondition?.status === "False") return "NotReady"
  return "Progressing"
}

function getStatusCounts(resources: K8sResource[]): Map<string, StatusCounts> {
  const countsByKind = new Map<string, StatusCounts>()

  resources.forEach((resource) => {
    const kind = resource.kind
    if (!countsByKind.has(kind)) {
      countsByKind.set(kind, {
        ready: 0,
        notReady: 0,
        progressing: 0,
        suspended: 0
      })
    }

    const counts = countsByKind.get(kind) || {
      ready: 0,
      notReady: 0,
      progressing: 0,
      suspended: 0
    }
    const status = getResourceStatus(resource)

    switch (status) {
      case "Ready":
        counts.ready++
        break
      case "NotReady":
        counts.notReady++
        break
      case "Progressing":
        counts.progressing++
        break
      case "Suspended":
        counts.suspended++
        break
    }
  })

  return countsByKind
}

const statusCounts = $derived(getStatusCounts(resources))
const visibleKinds = $derived(
  displayedKinds.filter((kind) => statusCounts.has(kind))
)

function handleKindClick(kind: string) {
  onFilterChange?.(kind, "All statuses")
}

function handleStatusClick(kind: string, status: string) {
  if (
    status === "Ready" ||
    status === "NotReady" ||
    status === "Progressing" ||
    status === "Suspended"
  ) {
    onFilterChange?.(kind, status)
  }
}

function getCardBackdropClass(counts: StatusCounts): string {
  if (counts.notReady > 0) {
    return "bg-red-50 border-red-200 hover:bg-red-100"
  }

  return "bg-green-50 border-green-200 hover:bg-green-100"
}
</script>

<div class="flex gap-4 overflow-x-auto pb-2">
  {#each visibleKinds as kind}
    {@const counts = statusCounts.get(kind) || {
      ready: 0,
      notReady: 0,
      progressing: 0,
      suspended: 0,
    }}
    <div
      class={`border rounded-lg p-4 shadow-sm shrink-0 min-w-max hover:shadow transition-all cursor-pointer ${getCardBackdropClass(counts)}`}
      onclick={() => handleKindClick(kind)}
      role="button"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleKindClick(kind);
      }}
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium ">{kind}s</h3>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <div
          class="flex items-center gap-1.5 text-green-600 hover:text-green-700 cursor-pointer"
          onclick={(e) => {
            e.stopPropagation();
            handleStatusClick(kind, "Ready");
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleStatusClick(kind, "Ready");
            }
          }}
        >
          <CheckCircleSolid size="sm" />
          <span class="font-semibold">{counts.ready}</span>
        </div>
        <div
          class="flex items-center gap-1.5 text-red-400 hover:text-red-500 cursor-pointer"
          onclick={(e) => {
            e.stopPropagation();
            handleStatusClick(kind, "NotReady");
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleStatusClick(kind, "NotReady");
            }
          }}
        >
          <ExclamationCircleSolid size="sm" />
          <span class="font-semibold">{counts.notReady}</span>
        </div>
        <div
          class="flex items-center gap-1.5  hover: cursor-pointer"
          onclick={(e) => {
            e.stopPropagation();
            handleStatusClick(kind, "Progressing");
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleStatusClick(kind, "Progressing");
            }
          }}
        >
          <ClockSolid size="sm" />
          <span class="font-semibold">{counts.progressing}</span>
        </div>
        <div
          class="flex items-center gap-1.5  hover: cursor-pointer"
          onclick={(e) => {
            e.stopPropagation();
            handleStatusClick(kind, "Suspended");
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleStatusClick(kind, "Suspended");
            }
          }}
        >
          <PauseSolid size="sm" />
          <span class="font-semibold">{counts.suspended}</span>
        </div>
      </div>
    </div>
  {/each}
</div>
