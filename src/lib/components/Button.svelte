<script lang="ts">
import type { HTMLButtonAttributes } from 'svelte/elements'

interface Props extends HTMLButtonAttributes {
	variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
	size?: 'xs' | 'sm' | 'md' | 'lg'
	fullWidth?: boolean
	loading?: boolean
}

let {
	variant = 'primary',
	size = 'md',
	fullWidth = false,
	loading = false,
	disabled = false,
	class: className = '',
	children,
	...restProps
}: Props = $props()

const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed'

const variantClasses = {
	primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md active:scale-95',
	secondary: 'bg-slate-700 text-slate-200 hover:bg-slate-600 focus:ring-slate-500 shadow-sm hover:shadow-md active:scale-95',
	ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 focus:ring-slate-500 active:scale-95',
	danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md active:scale-95'
}

const sizeClasses = {
	xs: 'px-2.5 py-1.5 text-xs gap-1',
	sm: 'px-3 py-2 text-sm gap-1.5',
	md: 'px-4 py-2.5 text-sm gap-2',
	lg: 'px-6 py-3 text-base gap-2.5'
}

const widthClass = fullWidth ? 'w-full' : ''
</script>

<button
	{...restProps}
	disabled={disabled || loading}
	class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {widthClass} {className}"
>
	{#if loading}
		<svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
		</svg>
	{/if}
	{@render children?.()}
</button>
