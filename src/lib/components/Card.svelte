<script lang="ts">
import type { HTMLAttributes } from 'svelte/elements'

interface Props extends HTMLAttributes<HTMLDivElement> {
	variant?: 'default' | 'elevated' | 'bordered' | 'interactive'
	padding?: 'none' | 'sm' | 'md' | 'lg'
	clickable?: boolean
	onClick?: () => void
}

let {
	variant = 'default',
	padding = 'md',
	clickable = false,
	onClick,
	class: className = '',
	children,
	...restProps
}: Props = $props()

const baseClasses = 'rounded-lg transition-all duration-200'

const variantClasses = {
	default: 'bg-slate-900 border border-slate-800',
	elevated: 'bg-slate-900 shadow-lg shadow-slate-950/50',
	bordered: 'bg-slate-900/50 border-2 border-slate-700',
	interactive: 'bg-slate-900 border border-slate-800 hover:border-slate-700 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer active:scale-[0.98]'
}

const paddingClasses = {
	none: '',
	sm: 'p-3',
	md: 'p-4',
	lg: 'p-6'
}

const interactiveClasses = clickable ? 'cursor-pointer hover:border-slate-700 active:scale-[0.98]' : ''
</script>

{#if onClick}
	<button
		type="button"
		{...restProps}
		on:click={onClick}
		class="{baseClasses} {variantClasses[variant]} {paddingClasses[padding]} {interactiveClasses} {className} text-left w-full"
	>
		{@render children?.()}
	</button>
{:else}
	<div
		{...restProps}
		class="{baseClasses} {variantClasses[variant]} {paddingClasses[padding]} {interactiveClasses} {className}"
	>
		{@render children?.()}
	</div>
{/if}
