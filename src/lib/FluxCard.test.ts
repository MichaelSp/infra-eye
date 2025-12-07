import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
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

	it('renders FluxCardCompact component', () => {
		render(FluxCard, { props: { resource: mockResource } });
		
		expect(screen.getByText('test-release')).toBeInTheDocument();
	});

	it('opens modal when card is clicked', async () => {
		const user = userEvent.setup();
		render(FluxCard, { props: { resource: mockResource } });
		
		const cardButton = screen.getByRole('button');
		await user.click(cardButton);
		
		// Modal should be visible (checking for modal content)
		// The modal renders additional details
		expect(screen.getAllByText('test-release').length).toBeGreaterThan(1);
	});

	it('passes resource to both components', () => {
		render(FluxCard, { props: { resource: mockResource } });
		
		expect(screen.getByText('test-release')).toBeInTheDocument();
		expect(screen.getByText('HelmRelease')).toBeInTheDocument();
	});

	it('handles resource with no namespace', () => {
		const clusterResource: K8sResource = {
			...mockResource,
			metadata: {
				name: 'cluster-resource',
				creationTimestamp: '2024-01-01T00:00:00Z' as any
			}
		};
		
		render(FluxCard, { props: { resource: clusterResource } });
		
		expect(screen.getByText('cluster-resource')).toBeInTheDocument();
	});
});
