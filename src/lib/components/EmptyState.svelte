<script lang="ts">
	import { InfoCircleSolid } from "flowbite-svelte-icons";

	export let kindFilter: string;
</script>

<div class="flex items-center justify-center py-20">
	<div class="text-center text-slate-400">
		<InfoCircleSolid size="xl" class="mx-auto mb-4" />
		<p class="text-lg">No resources found</p>
		<p class="text-sm mt-2">
			{#if kindFilter !== "all"}
				Try changing the filter or ensure resources of type "{kindFilter}" exist in your
				cluster.
			{:else}
				Ensure Flux resources exist in your Kubernetes cluster.
			{/if}
		</p>
	</div>
</div>
