/**
 * Shared filter state using Svelte 5 runes
 * This replaces the previous store-based approach for simple state management
 */

export const filterState = $state({
  kind: "all",
  namespace: "all",
  status: "All statuses",
  search: ""
})

export function clearFilters() {
  filterState.kind = "all"
  filterState.namespace = "all"
  filterState.status = "All statuses"
  filterState.search = ""
}
