<script lang="ts">
import { Badge } from "flowbite-svelte"
import { ClockOutline } from "flowbite-svelte-icons"
import type { K8sResource } from "$lib/stores/k8s-resources"

export let resource: K8sResource
export let onClick: () => void

// Get primary status
const readyCondition = resource.status?.conditions?.find(
  (c: any) => c.type === "Ready"
)
const isReady = readyCondition?.status === "True"

function statusVariant(ready: boolean) {
  if (ready) return "green"
  const hasFailed = resource.status?.conditions?.some(
    (c: any) =>
      c.status === "False" &&
      (c.reason?.toLowerCase().includes("fail") ||
        c.reason?.toLowerCase().includes("error"))
  )
  return hasFailed ? "red" : "yellow"
}

// Format timestamp
function formatTime(timestamp: string | undefined) {
  if (!timestamp) return "-"
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return "now"
  } catch {
    return "-"
  }
}

const lastReconcile = formatTime(
  resource.status?.lastHandledReconcileAt ||
    resource.status?.lastAppliedRevision ||
    resource.status?.artifact?.lastUpdateTime
)
</script>

<button
	type="button"
	class="w-full bg-slate-900 p-3 rounded-lg shadow hover:shadow-md transition-all cursor-pointer hover:bg-slate-800 text-left"
	on:click={onClick}
>
	<!-- Header -->
	<div class="flex items-start justify-between gap-2 mb-2">
		<div class="flex-1 min-w-0">
			<h3 class="text-sm font-semibold truncate text-white" title={resource.metadata.name}>
				{resource.metadata.name}
			</h3>
			<div class="text-xs text-gray-400 mt-0.5">
				{resource.kind}
			</div>
		</div>

		<Badge color={statusVariant(isReady)} class="text-xs flex-shrink-0">
			{isReady ? "✓" : "!"}
		</Badge>
	</div>

	<!-- Footer -->
	<div class="flex items-center justify-between text-xs text-gray-400 mt-2 pt-2 border-t border-slate-800">
		<span class="truncate">{resource.metadata.namespace || "default"}</span>
		<div class="flex items-center gap-1 flex-shrink-0">
			<ClockOutline size="xs" />
			<span>{lastReconcile}</span>
		</div>
	</div>
</button>
