<script lang="ts">
import { Input, Select } from "flowbite-svelte"
import { SearchOutline } from "flowbite-svelte-icons"
import type { Writable } from "svelte/store"

interface Props {
  kinds: string[]
  namespaces: string[]
  statuses?: string[]
  kindFilter: Writable<string>
  namespaceFilter: Writable<string>
  statusFilter: Writable<string>
  searchQuery: Writable<string>
}

let {
  kinds,
  namespaces,
  statuses = [
    "All statuses",
    "Ready",
    "NotReady",
    "Progressing",
    "Suspended"
  ],
  kindFilter,
  namespaceFilter,
  statusFilter,
  searchQuery
}: Props = $props()

const kindOptions = $derived(kinds.map((k) => ({
  value: k,
  name: k === "all" ? "All kinds" : k
})))
const namespaceOptions = $derived(namespaces.map((n) => ({
  value: n,
  name: n === "all" ? "All namespaces" : n
})))
const statusOptions = $derived(statuses.map((s) => ({ value: s, name: s })))
</script>

<div class="rounded-lg p-4">
  <div class="flex flex-row gap-3 items-center">
    <div class="flex-1">
      <Input
        placeholder="Search resources..."
        size="md"
        bind:value={$searchQuery}
      >
        <svelte:fragment slot="left">
          <SearchOutline class="w-4 h-4" />
        </svelte:fragment>
      </Input>
    </div>

    <Select
      size="md"
      items={kindOptions}
      bind:value={$kindFilter}
      class="w-40"
    />

    <Select
      size="md"
      items={namespaceOptions}
      bind:value={$namespaceFilter}
      class="w-48"
    />

    <Select
      size="md"
      items={statusOptions}
      bind:value={$statusFilter}
      class="w-44"
    />
  </div>
</div>
