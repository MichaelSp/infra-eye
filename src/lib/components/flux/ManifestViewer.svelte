<script lang="ts">
interface Props {
  manifest: string
  maxHeightClass?: string
}

let { manifest, maxHeightClass = "" }: Props = $props()
</script>

<div class={`bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-auto min-h-0 ${maxHeightClass}`}>
  <pre class="text-xs font-mono text-gray-100 whitespace-pre overflow-x-auto"><code>{manifest}</code></pre>
</div>
