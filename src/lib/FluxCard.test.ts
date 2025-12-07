import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import FluxCard from './FluxCard.svelte';
import type { K8sResource } from './stores/k8s-resources';

describe('FluxCard', () => {
	const mockResource: K8sResource = {
		apiVersion: 'helm.toolkit.fluxcd.io/v2beta1',
		kind: 'HelmRelease',
		metadata: {
			name: 'test-release',
			namespace: 'default',
			creationTimestamp: '2024-01-01T00:00:00Z' as any
		},
		spec: {
			chart: {
				spec: {
					chart: 'nginx'
				}
			}
		},
		status: {
			conditions: [
				{
					type: 'Ready',
					status: 'True',
					reason: 'ReconciliationSucceeded',
					message: 'Release reconciliation succeeded'
				}
			],
			lastHandledReconcileAt: '2024-01-01T00:10:00Z'
		}
	};

	it('renders resource name', () => {
		render(FluxCard, { props: { resource: mockResource } });
		
		expect(screen.getByText('test-release')).toBeInTheDocument();
	});

	it('renders resource kind', () => {
		render(FluxCard, { props: { resource: mockResource } });
		
		expect(screen.getByText('HelmRelease')).toBeInTheDocument();
	});

	it('renders namespace', () => {
		render(FluxCard, { props: { resource: mockResource } });
		
		expect(screen.getByText('default')).toBeInTheDocument();
	});
});
