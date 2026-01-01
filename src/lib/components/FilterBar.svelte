<script lang="ts">
import type { Writable } from "svelte/store"

export let kinds: string[]
export let kindFilter: Writable<string>
export let resourceCounts: Map<string, number>
export let totalCount: number
</script>

<div class="flex items-center gap-2 flex-wrap">
	<!-- All Tab -->
	<button
		class="px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm {$kindFilter ===
		'all'
			? 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/40'
			: 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:shadow-md active:scale-95'}"
		on:click={() => kindFilter.set("all")}
	>
		All
		<span
			class="ml-2 px-2 py-0.5 rounded-md text-xs font-semibold {$kindFilter === 'all'
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
				class="px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm {$kindFilter ===
				kind
					? 'bg-blue-600 text-white shadow-blue-500/30 hover:bg-blue-700 hover:shadow-md hover:shadow-blue-500/40'
					: 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:shadow-md active:scale-95'}"
				on:click={() => kindFilter.set(kind)}
			>
				{kind}
				<span
					class="ml-2 px-2 py-0.5 rounded-md text-xs font-semibold {$kindFilter === kind
						? 'bg-blue-700'
						: 'bg-slate-700'}"
				>
					{resourceCounts.get(kind) || 0}
				</span>
			</button>
		{/if}
	{/each}
</div>
