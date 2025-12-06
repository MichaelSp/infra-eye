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

{@render children()}
