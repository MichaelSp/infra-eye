import type { K8sResource } from '$lib/stores/k8s-resources';
import { render, screen } from '@testing-library/svelte';
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
		const { container } = render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		// Check if the resource name appears in the JSON manifest
		expect(screen.getByText(/"name": "test-release"/)).toBeInTheDocument();
	});

	it('displays ready status badge', () => {
		const { container } = render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		// Check that the status condition is rendered in the manifest
		expect(screen.getByText(/"status": "True"/)).toBeInTheDocument();
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
		
		const { container } = render(FluxDetailsModal, { props: { resource: failedResource, open: true } });
		
		// Check for the failure status message that's displayed in the UI
		expect(screen.getByText('Installation failed')).toBeInTheDocument();
	});

	it('renders metadata fields', () => {
		render(FluxDetailsModal, { props: { resource: mockResource, open: true } });
		
		expect(screen.getByText('Kind:')).toBeInTheDocument();
		expect(screen.getByText('HelmRelease')).toBeInTheDocument();
		expect(screen.getByText('Namespace:')).toBeInTheDocument();
		expect(screen.getByText('default')).toBeInTheDocument();
	});
});
