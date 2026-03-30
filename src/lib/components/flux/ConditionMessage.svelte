<script lang="ts">
import { ChevronDownOutline, ChevronUpOutline } from "flowbite-svelte-icons"
import ManifestViewer from "./ManifestViewer.svelte"
import { jsonStringToYaml } from "./manifest"
import { parseErrorMessage } from "./parseErrorMessage"

interface Props {
  message: string
}

let { message }: Props = $props()

let showDetails = $state(false)

const parsed = $derived(parseErrorMessage(message))

const embeddedYaml = $derived(
  parsed.embeddedJson ? jsonStringToYaml(parsed.embeddedJson) : ""
)
</script>

<div class="space-y-2">
  {#if parsed.isComplex}
    <!-- Main error headline -->
    <div>
      <div class="font-medium text-sm">{parsed.summary}</div>
    </div>

    <!-- Actual validation error if extracted -->
    {#if parsed.actualError}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
        <div class="text-xs font-mono text-red-800 dark:text-red-200">
          ❌ {parsed.actualError}
        </div>
      </div>
    {/if}

    <!-- Embedded JSON viewer -->
    {#if parsed.embeddedJson}
      <div>
        <button
          onclick={() => (showDetails = !showDetails)}
          class="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          {#if showDetails}
            <ChevronUpOutline size="xs" />
            <span>Collapse Request Details</span>
          {:else}
            <ChevronDownOutline size="xs" />
            <span>Expand Request Details</span>
          {/if}
        </button>

        <div class="mt-2">
          <ManifestViewer
            manifest={embeddedYaml}
            maxHeightClass={showDetails ? "max-h-80" : "max-h-48"}
          />
        </div>
      </div>
    {/if}
  {:else}
    <!-- Simple message -->
    <div class="text-sm">{message}</div>
  {/if}
</div>
