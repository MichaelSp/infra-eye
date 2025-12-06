<script lang="ts">
export let totalCount: number
export let resourceCounts: Map<string, number>
</script>

<div class="flex items-center gap-4 text-sm text-slate-300">
	<span>Total: <strong>{totalCount}</strong></span>
	{#each Array.from(resourceCounts.entries()) as [kind, count]}
		<span>{kind}: <strong>{count}</strong></span>
	{/each}
</div>
