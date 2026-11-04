import { afterEach, describe, expect, it, vi } from 'vitest';
import { acknowledgePublic, hasAcknowledgedPublic } from '../../src/lib/app/public-ack';

describe('public-data acknowledgment', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('keeps the acknowledgment for this page load when session storage throws', () => {
		const blocked = {
			getItem: () => {
				throw new DOMException('blocked', 'SecurityError');
			},
			setItem: () => {
				throw new DOMException('blocked', 'SecurityError');
			}
		};
		vi.stubGlobal('sessionStorage', blocked);
		expect(hasAcknowledgedPublic('bundle-blocked')).toBe(false);
		acknowledgePublic('bundle-blocked');
		// The board's click carries to /compare without a second prompt.
		expect(hasAcknowledgedPublic('bundle-blocked')).toBe(true);
		expect(hasAcknowledgedPublic('bundle-other')).toBe(false);
	});
});
