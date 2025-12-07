import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import StatsBar from './StatsBar.svelte';

describe('StatsBar', () => {
	it('renders total count', () => {
		const resourceCounts = new Map([
			['HelmRelease', 5],
			['Kustomization', 3]
		]);
		
		render(StatsBar, { props: { totalCount: 8, resourceCounts } });
		
		expect(screen.getByText('Total:')).toBeInTheDocument();
		expect(screen.getByText('8')).toBeInTheDocument();
	});

	it('renders all resource counts', () => {
		const resourceCounts = new Map([
			['HelmRelease', 5],
			['Kustomization', 3],
			['GitRepository', 2]
		]);
		
		render(StatsBar, { props: { totalCount: 10, resourceCounts } });
		
		expect(screen.getByText('HelmRelease:')).toBeInTheDocument();
		expect(screen.getByText('5')).toBeInTheDocument();
		expect(screen.getByText('Kustomization:')).toBeInTheDocument();
		expect(screen.getByText('3')).toBeInTheDocument();
		expect(screen.getByText('GitRepository:')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	it('handles empty resource counts', () => {
		const resourceCounts = new Map();
		
		render(StatsBar, { props: { totalCount: 0, resourceCounts } });
		
		expect(screen.getByText('Total:')).toBeInTheDocument();
		expect(screen.getByText('0')).toBeInTheDocument();
	});

	it('handles single resource type', () => {
		const resourceCounts = new Map([
			['HelmRelease', 12]
		]);
		
		render(StatsBar, { props: { totalCount: 12, resourceCounts } });
		
		expect(screen.getByText('Total:')).toBeInTheDocument();
		const twelves = screen.getAllByText('12');
		expect(twelves.length).toBe(2); // Total and HelmRelease both show 12
		expect(screen.getByText('HelmRelease:')).toBeInTheDocument();
	});

	it('applies correct styling', () => {
		const resourceCounts = new Map([['HelmRelease', 5]]);
		const { container } = render(StatsBar, { props: { totalCount: 5, resourceCounts } });
		
		const statsContainer = container.querySelector('.flex.items-center.gap-4');
		expect(statsContainer).toBeInTheDocument();
		expect(statsContainer).toHaveClass('text-sm', 'text-slate-300');
	});

	it('displays counts in bold', () => {
		const resourceCounts = new Map([['HelmRelease', 5]]);
		const { container } = render(StatsBar, { props: { totalCount: 5, resourceCounts } });
		
		const strongElements = container.querySelectorAll('strong');
		expect(strongElements.length).toBeGreaterThan(0);
	});
});
