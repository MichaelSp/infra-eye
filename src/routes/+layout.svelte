<script lang="ts">
import "../app.css"
import { goto } from "$app/navigation"
import { page } from "$app/stores"

let { data, children } = $props()

// Redirect to login if not authenticated and not already on login page
$effect(() => {
  if (!data.session && $page.url.pathname !== "/login") {
    goto("/login")
  }
})
</script>

<div class="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
  {@render children()}
</div>
