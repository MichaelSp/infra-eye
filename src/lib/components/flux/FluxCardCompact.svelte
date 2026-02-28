<script lang="ts">
import type { K8sResource } from "$lib/stores/k8s-resources"
import { Badge } from "flowbite-svelte"
import { ClockOutline } from "flowbite-svelte-icons"

interface Props {
  resource: K8sResource
  onClick: () => void
}

let { resource, onClick }: Props = $props()

// Get primary status
const readyCondition = $derived(
  resource.status?.conditions?.find((c: any) => c.type === "Ready")
)
const isReady = $derived(readyCondition?.status === "True")

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

const lastReconcile = $derived(
  formatTime(
    resource.status?.lastHandledReconcileAt ||
      resource.status?.lastAppliedRevision ||
      resource.status?.artifact?.lastUpdateTime
  )
)
</script>

<button
	type="button"
	class="w-full p-4 rounded-xl border shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] text-left group"
	onclick={onClick}
>
	<!-- Header -->
	<div class="flex items-start justify-between gap-2 mb-3">
		<div class="flex-1 min-w-0">
			<h3 class="text-sm font-semibold truncate transition-colors" title={resource.metadata.name}>
				{resource.metadata.name}
			</h3>
			<div class="text-xs mt-1 font-medium">
				{resource.kind}
			</div>
		</div>

		<Badge class="text-xs shrink-0 shadow-sm">
			{isReady ? "✓" : "!"}
		</Badge>
	</div>

  {#if resource.spec?.suspend}
    <div class="mt-2">
      <span class="inline-block text-xs px-2 py-0.5 rounded-full font-medium">Suspended</span>
    </div>
  {/if}

	<!-- Footer -->
	<div class="flex items-center justify-between text-xs mt-3 pt-3 border-t">
		<span class="truncate font-medium">{resource.metadata.namespace || "default"}</span>
		<div class="flex items-center gap-1.5 shrink-0">
			<ClockOutline size="xs" />
			<span>{lastReconcile}</span>
		</div>
	</div>
</button>
