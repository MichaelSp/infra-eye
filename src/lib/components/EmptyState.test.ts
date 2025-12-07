import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState.svelte';

describe('EmptyState', () => {
	it('renders with "all" filter message', () => {
		render(EmptyState, { props: { kindFilter: 'all' } });
		
		expect(screen.getByText('No resources found')).toBeInTheDocument();
		expect(screen.getByText(/Ensure Flux resources exist/)).toBeInTheDocument();
	});

	it('renders with specific kind filter message', () => {
		render(EmptyState, { props: { kindFilter: 'HelmRelease' } });
		
		expect(screen.getByText('No resources found')).toBeInTheDocument();
		expect(screen.getByText(/Try changing the filter/)).toBeInTheDocument();
		expect(screen.getByText(/HelmRelease/)).toBeInTheDocument();
	});

	it('displays different messages for different filters', () => {
		const { rerender } = render(EmptyState, { props: { kindFilter: 'Kustomization' } });
		
		expect(screen.getByText(/Kustomization/)).toBeInTheDocument();
		
		rerender({ kindFilter: 'GitRepository' });
		expect(screen.getByText(/GitRepository/)).toBeInTheDocument();
	});

	it('contains info icon', () => {
		const { container } = render(EmptyState, { props: { kindFilter: 'all' } });
		
		// Check for SVG icon by looking for the container with appropriate classes
		const iconContainer = container.querySelector('svg');
		expect(iconContainer).toBeInTheDocument();
	});
});
