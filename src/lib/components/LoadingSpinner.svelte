<script lang="ts">
interface Props {
  message?: string
}

let { message = "Loading..." }: Props = $props()
</script>

<div class="flex items-center justify-center py-20">
	<div class="text-center">
		<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 "></div>
		<p class="mt-4 ">{message}</p>
	</div>
</div>
