import type { K8sResource } from "$lib/stores/k8s-resources";

export interface SourceInfo {
	type: string;
	value: string;
	version?: string;
	branch?: string;
	tag?: string;
	repo?: string;
	source?: string;
}

/**
 * Extract source information based on resource kind
 */
export function getSourceInfo(resource: K8sResource): SourceInfo {
	if (resource.kind === "HelmRelease") {
		return {
			type: "Helm Chart",
			value: resource.spec?.chart?.spec?.chart || "-",
			version: resource.spec?.chart?.spec?.version || "latest",
			repo:
				resource.spec?.chart?.spec?.sourceRef?.name ||
				resource.spec?.chart?.spec?.sourceRef?.namespace,
		};
	}
	if (resource.kind === "Kustomization") {
		return {
			type: "Kustomization",
			value: resource.spec?.path || "/",
			source: resource.spec?.sourceRef?.name,
		};
	}
	if (resource.kind === "GitRepository") {
		return {
			type: "Git Repository",
			value: resource.spec?.url || "-",
			branch: resource.spec?.ref?.branch || resource.spec?.ref?.tag || "main",
		};
	}
	if (resource.kind === "OCIRepository") {
		return {
			type: "OCI Repository",
			value: resource.spec?.url || "-",
			tag: resource.spec?.ref?.tag || "latest",
		};
	}
	return { type: "Source", value: "-" };
}

/**
 * Format timestamp to relative time
 */
export function formatTime(timestamp: string | undefined): string {
	if (!timestamp) return "-";
	try {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return "just now";
	} catch {
		return timestamp;
	}
}

/**
 * Format timestamp to short relative time (for compact views)
 */
export function formatTimeShort(timestamp: string | undefined): string {
	if (!timestamp) return "-";
	try {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d`;
		if (hours > 0) return `${hours}h`;
		if (minutes > 0) return `${minutes}m`;
		return "now";
	} catch {
		return "-";
	}
}

/**
 * Get status variant color
 */
export function getStatusColor(isReady: boolean, resource: K8sResource): "green" | "red" | "yellow" {
	if (isReady) return "green";
	const hasFailed = resource.status?.conditions?.some(
		(c: any) =>
			c.status === "False" &&
			(c.reason?.toLowerCase().includes("fail") ||
				c.reason?.toLowerCase().includes("error")),
	);
	return hasFailed ? "red" : "yellow";
}
