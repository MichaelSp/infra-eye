<script lang="ts">
	import FluxCardCompact from "$lib/components/flux/FluxCardCompact.svelte";
	import FluxDetailsModal from "$lib/components/flux/FluxDetailsModal.svelte";
	import type { K8sResource } from "$lib/stores/k8s-resources";

	export let resource: K8sResource;

	let showModal = false;
</script>

<FluxCardCompact {resource} onClick={() => (showModal = true)} />
<FluxDetailsModal {resource} bind:open={showModal} />
