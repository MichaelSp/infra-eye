import type { K8sResource } from '$lib/stores/k8s-resources';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import FluxDetailsModal from './FluxDetailsModal.svelte';

describe('FluxDetailsModal', () => {
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
					sourceRef: {
						name: 'my-repo',
						kind: 'HelmRepository'
					},
					chart: 'nginx',
					version: '1.0.0'
				}
			}
		},
		status: {
			conditions: [
				{
					type: 'Ready',
					status: 'True',
					reason: 'ReconciliationSucceeded',
					message: 'Release reconciliation succeeded',
					lastTransitionTime: '2024-01-01T00:10:00Z'
				}
			],
			lastHandledReconcileAt: '2024-01-01T00:10:00Z'
		}
	};

	it('renders resource name in header', () => {
		render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		expect(screen.getByText('test-release')).toBeInTheDocument();
	});

	it('displays ready status badge', () => {
		render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		expect(screen.getByText('Ready')).toBeInTheDocument();
	});

	it('displays not ready status badge for failed resource', () => {
		const failedResource: K8sResource = {
			...mockResource,
			status: {
				conditions: [
					{
						type: 'Ready',
						status: 'False',
						reason: 'InstallFailed',
						message: 'Installation failed'
					}
				]
			}
		};
		
		render(FluxDetailsModal, { props: { resource: failedResource, open: true } });
		
		expect(screen.getByText('Not Ready')).toBeInTheDocument();
	});

	it('renders metadata fields', () => {
		render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		expect(screen.getByText('Kind:')).toBeInTheDocument();
		expect(screen.getByText('HelmRelease')).toBeInTheDocument();
		expect(screen.getByText('Namespace:')).toBeInTheDocument();
		expect(screen.getByText('default')).toBeInTheDocument();
	});

	it('displays source information', () => {
		render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		expect(screen.getByText('Source Information')).toBeInTheDocument();
	});

	it('shows conditions section', () => {
		render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		expect(screen.getByText(/Conditions \(1\)/)).toBeInTheDocument();
	});

	it('toggles conditions visibility', async () => {
		const user = userEvent.setup();
		render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		const conditionsButton = screen.getByText(/Conditions \(1\)/).closest('button');
		expect(conditionsButton).toBeInTheDocument();
		
		// Initially conditions should be hidden
		expect(screen.queryByText('ReconciliationSucceeded')).not.toBeInTheDocument();
		
		// Click to show conditions
		await user.click(conditionsButton!);
		expect(screen.getByText('ReconciliationSucceeded')).toBeInTheDocument();
	});

	it('displays full resource manifest', () => {
		render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		expect(screen.getByText('Full Resource Manifest')).toBeInTheDocument();
		expect(screen.getByText(/"kind": "HelmRelease"/)).toBeInTheDocument();
	});

	it('renders status message for not ready resources', () => {
		const notReadyResource: K8sResource = {
			...mockResource,
			status: {
				conditions: [
					{
						type: 'Ready',
						status: 'False',
						reason: 'InstallFailed',
						message: 'Installation failed due to timeout'
					}
				]
			}
		};
		
		render(FluxDetailsModal, { props: { resource: notReadyResource, open: true } });
		
		expect(screen.getByText('Status Message')).toBeInTheDocument();
		expect(screen.getByText('Installation failed due to timeout')).toBeInTheDocument();
	});

	it('displays multiple conditions', () => {
		const multiConditionResource: K8sResource = {
			...mockResource,
			status: {
				conditions: [
					{
						type: 'Ready',
						status: 'True',
						reason: 'ReconciliationSucceeded',
						message: 'Success'
					},
					{
						type: 'Released',
						status: 'True',
						reason: 'InstallSucceeded',
						message: 'Installation successful'
					}
				]
			}
		};
		
		render(FluxDetailsModal, { props: { resource: multiConditionResource, open: true } });
		
		expect(screen.getByText(/Conditions \(2\)/)).toBeInTheDocument();
	});

	it('handles resource without namespace', () => {
		const clusterResource: K8sResource = {
			...mockResource,
			metadata: {
				name: 'cluster-resource',
				creationTimestamp: '2024-01-01T00:00:00Z' as any
			}
		};
		
		render(FluxDetailsModal, { props: { resource: clusterResource, open: true } });
		
		// Should default to 'default'
		expect(screen.getByText('default')).toBeInTheDocument();
	});
});
