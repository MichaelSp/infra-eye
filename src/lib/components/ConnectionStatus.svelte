<script lang="ts">
import { Alert, Badge, Spinner } from "flowbite-svelte"
import {
  CheckCircleSolid,
  ExclamationCircleSolid,
  InfoCircleSolid
} from "flowbite-svelte-icons"

export let status: "connecting" | "connected" | "error" | "disconnected"
export let errors: (string | null)[] = []
</script>

<div>
	<!-- Connection Status Badge -->
	<div class="flex items-center gap-3">
		{#if status === "connecting"}
			<Badge color="yellow" class="flex items-center gap-2">
				<Spinner size="4" />
				Connecting...
			</Badge>
		{:else if status === "connected"}
			<Badge color="green" class="flex items-center gap-2">
				<CheckCircleSolid size="xs" />
				Connected
			</Badge>
		{:else if status === "error"}
			<Badge color="red" class="flex items-center gap-2">
				<ExclamationCircleSolid size="xs" />
				Connection Error
			</Badge>
		{:else}
			<Badge color="gray" class="flex items-center gap-2">
				<InfoCircleSolid size="xs" />
				Disconnected
			</Badge>
		{/if}
	</div>

	<!-- Error messages -->
	{#if errors.length > 0}
		<div class="mt-3">
			{#each errors as error}
				{#if error}
					<Alert color="red" class="mb-2">
						<InfoCircleSolid slot="icon" class="w-4 h-4" />
						{error}
					</Alert>
				{/if}
			{/each}
		</div>
	{/if}
</div>
