import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LoadingSpinner from './LoadingSpinner.svelte';

describe('LoadingSpinner', () => {
	it('renders with default message', () => {
		render(LoadingSpinner);
		
		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	it('renders with custom message', () => {
		render(LoadingSpinner, { props: { message: 'Fetching data...' } });
		
		expect(screen.getByText('Fetching data...')).toBeInTheDocument();
	});

	it('contains spinning animation element', () => {
		const { container } = render(LoadingSpinner);
		
		const spinner = container.querySelector('.animate-spin');
		expect(spinner).toBeInTheDocument();
	});

	it('applies correct styling classes', () => {
		const { container } = render(LoadingSpinner);
		
		const spinner = container.querySelector('.animate-spin');
		expect(spinner).toHaveClass('rounded-full', 'border-b-2', 'border-blue-500');
	});

	it('displays message below spinner', () => {
		const { container } = render(LoadingSpinner, { props: { message: 'Please wait' } });
		
		const messageElement = screen.getByText('Please wait');
		expect(messageElement).toHaveClass('text-slate-400');
	});
});
