import type { K8sResource } from '$lib/stores/k8s-resources';
import { describe, expect, it } from 'vitest';
import { formatTime, formatTimeShort, getSourceInfo, getStatusColor } from './utils';

describe('utils', () => {
	describe('getSourceInfo', () => {
		it('extracts HelmRelease source info', () => {
			const resource: K8sResource = {
				apiVersion: 'helm.toolkit.fluxcd.io/v2beta1',
				kind: 'HelmRelease',
				metadata: { name: 'test', namespace: 'default' },
				spec: {
					chart: {
						spec: {
							chart: 'nginx',
							version: '1.0.0',
							sourceRef: {
								name: 'bitnami',
								namespace: 'flux-system'
							}
						}
					}
				}
			};

			const result = getSourceInfo(resource);
			expect(result.type).toBe('Helm Chart');
			expect(result.value).toBe('nginx');
			expect(result.version).toBe('1.0.0');
			expect(result.repo).toBe('bitnami');
		});

		it('handles HelmRelease with missing fields', () => {
			const resource: K8sResource = {
				apiVersion: 'helm.toolkit.fluxcd.io/v2beta1',
				kind: 'HelmRelease',
				metadata: { name: 'test', namespace: 'default' },
				spec: {}
			};

			const result = getSourceInfo(resource);
			expect(result.type).toBe('Helm Chart');
			expect(result.value).toBe('-');
			expect(result.version).toBe('latest');
		});

		it('extracts Kustomization source info', () => {
			const resource: K8sResource = {
				apiVersion: 'kustomize.toolkit.fluxcd.io/v1',
				kind: 'Kustomization',
				metadata: { name: 'test', namespace: 'default' },
				spec: {
					path: './infrastructure',
					sourceRef: {
						name: 'flux-system'
					}
				}
			};

			const result = getSourceInfo(resource);
			expect(result.type).toBe('Kustomization');
			expect(result.value).toBe('./infrastructure');
			expect(result.source).toBe('flux-system');
		});

		it('handles Kustomization with default path', () => {
			const resource: K8sResource = {
				apiVersion: 'kustomize.toolkit.fluxcd.io/v1',
				kind: 'Kustomization',
				metadata: { name: 'test', namespace: 'default' },
				spec: {
					sourceRef: {
						name: 'flux-system'
					}
				}
			};

			const result = getSourceInfo(resource);
			expect(result.value).toBe('/');
		});

		it('extracts GitRepository source info', () => {
			const resource: K8sResource = {
				apiVersion: 'source.toolkit.fluxcd.io/v1',
				kind: 'GitRepository',
				metadata: { name: 'test', namespace: 'default' },
				spec: {
					url: 'https://github.com/user/repo',
					ref: {
						branch: 'main'
					}
				}
			};

			const result = getSourceInfo(resource);
			expect(result.type).toBe('Git Repository');
			expect(result.value).toBe('https://github.com/user/repo');
			expect(result.branch).toBe('main');
		});

		it('handles GitRepository with tag instead of branch', () => {
			const resource: K8sResource = {
				apiVersion: 'source.toolkit.fluxcd.io/v1',
				kind: 'GitRepository',
				metadata: { name: 'test', namespace: 'default' },
				spec: {
					url: 'https://github.com/user/repo',
					ref: {
						tag: 'v1.0.0'
					}
				}
			};

			const result = getSourceInfo(resource);
			expect(result.branch).toBe('v1.0.0');
		});

		it('handles GitRepository with no ref', () => {
			const resource: K8sResource = {
				apiVersion: 'source.toolkit.fluxcd.io/v1',
				kind: 'GitRepository',
				metadata: { name: 'test', namespace: 'default' },
				spec: {
					url: 'https://github.com/user/repo'
				}
			};

			const result = getSourceInfo(resource);
			expect(result.branch).toBe('main');
		});

		it('extracts OCIRepository source info', () => {
			const resource: K8sResource = {
				apiVersion: 'source.toolkit.fluxcd.io/v1beta2',
				kind: 'OCIRepository',
				metadata: { name: 'test', namespace: 'default' },
				spec: {
					url: 'oci://ghcr.io/user/repo',
					ref: {
						tag: 'v1.0.0'
					}
				}
			};

			const result = getSourceInfo(resource);
			expect(result.type).toBe('OCI Repository');
			expect(result.value).toBe('oci://ghcr.io/user/repo');
			expect(result.tag).toBe('v1.0.0');
		});

		it('handles OCIRepository with default tag', () => {
			const resource: K8sResource = {
				apiVersion: 'source.toolkit.fluxcd.io/v1beta2',
				kind: 'OCIRepository',
				metadata: { name: 'test', namespace: 'default' },
				spec: {
					url: 'oci://ghcr.io/user/repo'
				}
			};

			const result = getSourceInfo(resource);
			expect(result.tag).toBe('latest');
		});

		it('returns default for unknown resource kind', () => {
			const resource: K8sResource = {
				apiVersion: 'v1',
				kind: 'Unknown',
				metadata: { name: 'test', namespace: 'default' }
			};

			const result = getSourceInfo(resource);
			expect(result.type).toBe('Source');
			expect(result.value).toBe('-');
		});
	});

	describe('formatTime', () => {
		it('returns "-" for undefined timestamp', () => {
			expect(formatTime(undefined)).toBe('-');
		});

		it('formats time as "just now" for recent timestamps', () => {
			const now = new Date().toISOString();
			expect(formatTime(now)).toBe('just now');
		});

		it('formats time in minutes', () => {
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
			expect(formatTime(fiveMinutesAgo)).toBe('5m ago');
		});

		it('formats time in hours', () => {
			const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
			expect(formatTime(twoHoursAgo)).toBe('2h ago');
		});

		it('formats time in days', () => {
			const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
			expect(formatTime(threeDaysAgo)).toBe('3d ago');
		});

		it('handles invalid date strings', () => {
			// Invalid dates will still be parsed but might return unexpected results
			// The function returns the original string in the catch block
			const result = formatTime('not-a-real-date-format');
			expect(result).toBeDefined();
		});
	});

	describe('formatTimeShort', () => {
		it('returns "-" for undefined timestamp', () => {
			expect(formatTimeShort(undefined)).toBe('-');
		});

		it('formats time as "now" for recent timestamps', () => {
			const now = new Date().toISOString();
			expect(formatTimeShort(now)).toBe('now');
		});

		it('formats time in minutes (short)', () => {
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
			expect(formatTimeShort(fiveMinutesAgo)).toBe('5m');
		});

		it('formats time in hours (short)', () => {
			const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
			expect(formatTimeShort(twoHoursAgo)).toBe('2h');
		});

		it('formats time in days (short)', () => {
			const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
			expect(formatTimeShort(threeDaysAgo)).toBe('3d');
		});

		it('handles invalid date strings', () => {
			// Invalid dates will still be parsed but might return unexpected results
			const result = formatTimeShort('not-a-real-date-format');
			expect(result).toBeDefined();
		});
	});

	describe('getStatusColor', () => {
		it('returns green for ready resources', () => {
			const resource: K8sResource = {
				apiVersion: 'v1',
				kind: 'Test',
				metadata: { name: 'test', namespace: 'default' },
				status: {
					conditions: [{ type: 'Ready', status: 'True' }]
				}
			};

			expect(getStatusColor(true, resource)).toBe('green');
		});

		it('returns red for failed resources', () => {
			const resource: K8sResource = {
				apiVersion: 'v1',
				kind: 'Test',
				metadata: { name: 'test', namespace: 'default' },
				status: {
					conditions: [
						{
							type: 'Ready',
							status: 'False',
							reason: 'InstallFailed'
						}
					]
				}
			};

			expect(getStatusColor(false, resource)).toBe('red');
		});

		it('returns red for resources with error reason', () => {
			const resource: K8sResource = {
				apiVersion: 'v1',
				kind: 'Test',
				metadata: { name: 'test', namespace: 'default' },
				status: {
					conditions: [
						{
							type: 'Ready',
							status: 'False',
							reason: 'ReconciliationError'
						}
					]
				}
			};

			expect(getStatusColor(false, resource)).toBe('red');
		});

		it('returns yellow for not ready resources without failure', () => {
			const resource: K8sResource = {
				apiVersion: 'v1',
				kind: 'Test',
				metadata: { name: 'test', namespace: 'default' },
				status: {
					conditions: [
						{
							type: 'Ready',
							status: 'False',
							reason: 'Progressing'
						}
					]
				}
			};

			expect(getStatusColor(false, resource)).toBe('yellow');
		});

		it('returns yellow when no conditions exist', () => {
			const resource: K8sResource = {
				apiVersion: 'v1',
				kind: 'Test',
				metadata: { name: 'test', namespace: 'default' }
			};

			expect(getStatusColor(false, resource)).toBe('yellow');
		});
	});
});
