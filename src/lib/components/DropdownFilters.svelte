<script lang="ts">
import { Input, Select } from "flowbite-svelte"
import { SearchOutline } from "flowbite-svelte-icons"

interface Props {
  kinds: string[]
  namespaces: string[]
  statuses?: string[]
  kindFilter: string
  namespaceFilter: string
  statusFilter: string
  searchQuery: string
  onUpdate: (filters: {
    kind: string
    namespace: string
    status: string
    search: string
  }) => void
}

let {
  kinds,
  namespaces,
  statuses = ["All statuses", "Ready", "NotReady", "Progressing", "Suspended"],
  kindFilter,
  namespaceFilter,
  statusFilter,
  searchQuery,
  onUpdate
}: Props = $props()

const kindOptions = $derived(
  kinds.map((k) => ({
    value: k,
    name: k === "all" ? "All kinds" : k
  }))
)
const namespaceOptions = $derived(
  namespaces.map((n) => ({
    value: n,
    name: n === "all" ? "All namespaces" : n
  }))
)
const statusOptions = $derived(statuses.map((s) => ({ value: s, name: s })))
</script>

<div class="rounded-lg p-4">
  <div class="flex flex-row gap-3 items-center">
    <div class="flex-1">
      <Input
        placeholder="Search resources..."
        size="md"
        value={searchQuery}
        oninput={(e) => {
          const target = e.target as HTMLInputElement
          onUpdate({
            kind: kindFilter,
            namespace: namespaceFilter,
            status: statusFilter,
            search: target.value
          })
        }}
      >
        <svelte:fragment slot="left">
          <SearchOutline class="w-4 h-4" />
        </svelte:fragment>
      </Input>
    </div>

    <Select
      size="md"
      items={kindOptions}
      value={kindFilter}
      onchange={(e) => {
        const target = e.target as HTMLSelectElement
        onUpdate({
          kind: target.value,
          namespace: namespaceFilter,
          status: statusFilter,
          search: searchQuery
        })
      }}
      class="w-40"
    />

    <Select
      size="md"
      items={namespaceOptions}
      value={namespaceFilter}
      onchange={(e) => {
        const target = e.target as HTMLSelectElement
        onUpdate({
          kind: kindFilter,
          namespace: target.value,
          status: statusFilter,
          search: searchQuery
        })
      }}
      class="w-48"
    />

    <Select
      size="md"
      items={statusOptions}
      value={statusFilter}
      onchange={(e) => {
        const target = e.target as HTMLSelectElement
        onUpdate({
          kind: kindFilter,
          namespace: namespaceFilter,
          status: target.value,
          search: searchQuery
        })
      }}
      class="w-44"
    />
  </div>
</div>
