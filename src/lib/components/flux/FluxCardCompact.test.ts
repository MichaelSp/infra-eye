import type { K8sResource } from '$lib/stores/k8s-resources';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FluxCardCompact from './FluxCardCompact.svelte';

describe('FluxCardCompact', () => {
	const mockResourceReady: K8sResource = {
		apiVersion: 'helm.toolkit.fluxcd.io/v2beta1',
		kind: 'HelmRelease',
		metadata: {
			name: 'test-release',
			namespace: 'default',
			creationTimestamp: '2024-01-01T00:00:00Z' as any
		},
		spec: {},
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

	const mockResourceNotReady: K8sResource = {
		...mockResourceReady,
		metadata: {
			name: 'failing-release',
			namespace: 'default',
			creationTimestamp: '2024-01-01T00:00:00Z' as any
		},
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

	it('renders resource name', () => {
		const onClick = vi.fn();
		render(FluxCardCompact, { props: { resource: mockResourceReady, onClick } });
		
		expect(screen.getByText('test-release')).toBeInTheDocument();
	});

	it('renders resource kind', () => {
		const onClick = vi.fn();
		render(FluxCardCompact, { props: { resource: mockResourceReady, onClick } });
		
		expect(screen.getByText('HelmRelease')).toBeInTheDocument();
	});

	it('renders namespace', () => {
		const onClick = vi.fn();
		render(FluxCardCompact, { props: { resource: mockResourceReady, onClick } });
		
		expect(screen.getByText('default')).toBeInTheDocument();
	});

	it('shows green badge for ready resource', () => {
		const onClick = vi.fn();
		const { container } = render(FluxCardCompact, { props: { resource: mockResourceReady, onClick } });
		
		// Check for success checkmark
		expect(screen.getByText('✓')).toBeInTheDocument();
	});

	it('shows red badge for failed resource', () => {
		const onClick = vi.fn();
		render(FluxCardCompact, { props: { resource: mockResourceNotReady, onClick } });
		
		// Check for warning icon
		expect(screen.getByText('!')).toBeInTheDocument();
	});

	it('calls onClick when clicked', async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(FluxCardCompact, { props: { resource: mockResourceReady, onClick } });
		
		const button = screen.getByRole('button');
		await user.click(button);
		
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('formats recent timestamp', () => {
		const onClick = vi.fn();
		const recentResource: K8sResource = {
			...mockResourceReady,
			status: {
				...mockResourceReady.status,
				lastHandledReconcileAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() // 2 minutes ago
			}
		};
		
		render(FluxCardCompact, { props: { resource: recentResource, onClick } });
		
		expect(screen.getByText('2m')).toBeInTheDocument();
	});

	it('handles resource without namespace', () => {
		const onClick = vi.fn();
		const clusterResource: K8sResource = {
			...mockResourceReady,
			metadata: {
				name: 'cluster-resource',
				creationTimestamp: '2024-01-01T00:00:00Z' as any
			}
		};
		
		render(FluxCardCompact, { props: { resource: clusterResource, onClick } });
		
		expect(screen.getByText('default')).toBeInTheDocument();
	});

	it('applies hover styling', () => {
		const onClick = vi.fn();
		const { container } = render(FluxCardCompact, { props: { resource: mockResourceReady, onClick } });
		
		const button = container.querySelector('button');
		expect(button).toHaveClass('hover:bg-slate-800', 'hover:shadow-md');
	});
});
