import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ConnectionStatus from './ConnectionStatus.svelte';

describe('ConnectionStatus', () => {
	it('renders connecting status with spinner', () => {
		render(ConnectionStatus, { props: { status: 'connecting', errors: [] } });
		
		expect(screen.getByText('Connecting...')).toBeInTheDocument();
	});

	it('renders connected status with success badge', () => {
		render(ConnectionStatus, { props: { status: 'connected', errors: [] } });
		
		expect(screen.getByText('Connected')).toBeInTheDocument();
	});

	it('renders error status with error badge', () => {
		render(ConnectionStatus, { props: { status: 'error', errors: [] } });
		
		expect(screen.getByText('Connection Error')).toBeInTheDocument();
	});

	it('renders disconnected status with info badge', () => {
		render(ConnectionStatus, { props: { status: 'disconnected', errors: [] } });
		
		expect(screen.getByText('Disconnected')).toBeInTheDocument();
	});

	it('displays error messages when provided', () => {
		const errors = ['Connection timeout', 'Network error'];
		render(ConnectionStatus, { props: { status: 'error', errors } });
		
		expect(screen.getByText('Connection timeout')).toBeInTheDocument();
		expect(screen.getByText('Network error')).toBeInTheDocument();
	});

	it('does not display null errors', () => {
		const errors = ['Valid error', null, 'Another error'];
		render(ConnectionStatus, { props: { status: 'error', errors } });
		
		expect(screen.getByText('Valid error')).toBeInTheDocument();
		expect(screen.getByText('Another error')).toBeInTheDocument();
	});

	it('handles empty errors array', () => {
		render(ConnectionStatus, { props: { status: 'connected', errors: [] } });
		
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});
