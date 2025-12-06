<script lang="ts">
	import type { Writable } from "svelte/store";

	export let kinds: string[];
	export let kindFilter: Writable<string>;
	export let resourceCounts: Map<string, number>;
	export let totalCount: number;
</script>

<div class="flex items-center gap-2 flex-wrap">
	<!-- All Tab -->
	<button
		class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {$kindFilter ===
		'all'
			? 'bg-blue-600 text-white'
			: 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
		on:click={() => kindFilter.set("all")}
	>
		All
		<span
			class="ml-1.5 px-1.5 py-0.5 rounded text-xs {$kindFilter === 'all'
				? 'bg-blue-700'
				: 'bg-slate-700'}"
		>
			{totalCount}
		</span>
	</button>

	<!-- Kind Tabs -->
	{#each kinds as kind}
		{#if kind !== "all"}
			<button
				class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {$kindFilter ===
				kind
					? 'bg-blue-600 text-white'
					: 'bg-slate-800 text-slate-300 hover:bg-slate-700'}"
				on:click={() => kindFilter.set(kind)}
			>
				{kind}
				<span
					class="ml-1.5 px-1.5 py-0.5 rounded text-xs {$kindFilter === kind
						? 'bg-blue-700'
						: 'bg-slate-700'}"
				>
					{resourceCounts.get(kind) || 0}
				</span>
			</button>
		{/if}
	{/each}
</div>
