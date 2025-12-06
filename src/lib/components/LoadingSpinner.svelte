<script lang="ts">
	export let message = "Loading...";
</script>

<div class="flex items-center justify-center py-20">
	<div class="text-center">
		<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
		<p class="mt-4 text-slate-400">{message}</p>
	</div>
</div>
