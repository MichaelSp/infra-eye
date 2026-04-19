<script lang="ts">
import { signIn } from "@auth/sveltekit/client"
import { Button, Card } from "flowbite-svelte"

async function handleLogin() {
  await signIn("oidc", { redirectTo: "/" })
}
</script>

<svelte:head>
	<title>Login - Infra Eye</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
	<Card class="w-full max-w-md">
		<div class="text-center space-y-6">
			<div>
				<h1 class="text-3xl font-bold mb-2">Infra Eye</h1>
				<p class="text-gray-600 dark:text-gray-400">GitOps Dashboard</p>
			</div>

			<div class="space-y-4">
				<p class="text-gray-600 dark:text-gray-400">
					Sign in with your OIDC provider to access the dashboard
				</p>

				<Button class="w-full" size="lg" onclick={handleLogin}>
					Sign in with OIDC
				</Button>
			</div>

			<div class="text-xs text-gray-500 dark:text-gray-400 pt-4">
				Secure authentication using OpenID Connect
			</div>
		</div>
	</Card>
</div>
