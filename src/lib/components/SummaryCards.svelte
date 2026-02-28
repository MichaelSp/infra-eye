<script lang="ts">
import type { K8sResource } from "$lib/stores/k8s-resources"
import {
  CheckCircleSolid,
  ClockSolid,
  ExclamationCircleSolid,
  PauseSolid
} from "flowbite-svelte-icons"
import type { Writable } from "svelte/store"

interface Props {
  resources: K8sResource[]
  kindFilter: Writable<string>
  statusFilter: Writable<string>
}

let { resources, kindFilter, statusFilter }: Props = $props()

interface StatusCounts {
  ready: number
  notReady: number
  progressing: number
  suspended: number
}

// Only show these specific resource types
const displayedKinds = ["Kustomization", "HelmRelease", "HelmChart"]

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
const totalFailingResources = $derived(Array.from(statusCounts.values()).reduce(
  (sum, counts) => sum + counts.notReady,
  0
))

function handleKindClick(kind: string) {
  kindFilter.set(kind)
  statusFilter.set("All statuses")
}

function handleStatusClick(status: string) {
  if (
    status === "Ready" ||
    status === "NotReady" ||
    status === "Progressing" ||
    status === "Suspended"
  ) {
    statusFilter.set(status)
    kindFilter.set("all")
  }
}
</script>

<div class="flex gap-4 overflow-x-auto pb-2">
  {#each displayedKinds as kind}
    {@const counts = statusCounts.get(kind) || {
      ready: 0,
      notReady: 0,
      progressing: 0,
      suspended: 0,
    }}
    <div
      class="bg-white border  rounded-lg p-4 shadow-sm shrink-0 min-w-max hover: hover:shadow transition-all cursor-pointer"
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
            handleKindClick(kind);
            handleStatusClick("Ready");
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleKindClick(kind);
              handleStatusClick("Ready");
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
            handleKindClick(kind);
            handleStatusClick("NotReady");
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleKindClick(kind);
              handleStatusClick("NotReady");
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
            handleKindClick(kind);
            handleStatusClick("Progressing");
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleKindClick(kind);
              handleStatusClick("Progressing");
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
            handleKindClick(kind);
            handleStatusClick("Suspended");
          }}
          role="button"
          tabindex="0"
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              handleKindClick(kind);
              handleStatusClick("Suspended");
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
