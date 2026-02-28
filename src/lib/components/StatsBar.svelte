<script lang="ts">
interface Props {
  totalCount: number
  resourceCounts: Map<string, number>
}

let { totalCount, resourceCounts }: Props = $props()
</script>

<div class="flex items-center gap-4 text-sm ">
	<span>Total: <strong>{totalCount}</strong></span>
	{#each Array.from(resourceCounts.entries()) as [kind, count]}
		<span>{kind}: <strong>{count}</strong></span>
	{/each}
</div>
