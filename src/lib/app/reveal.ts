// D-62: sections rise 32px and fade in once as they enter the viewport (ai-design-skills,
// landing-page-design B7). Applied to section containers only — never to a number, a piece or
// a bar. An element in the first screen is left alone, and nothing is hidden until script is
// running, so a script failure or a screenshot of the first screen shows everything; print shows
// every section through a print rule in base.css.

let observer: IntersectionObserver | undefined;
let queued: HTMLElement[] = [];

function shared(): IntersectionObserver {
	// One observer for every section. Any visible pixel counts once it is 10% clear of the bottom
	// edge; a fraction threshold could never be met by a section taller than the viewport
	// divided by that fraction.
	observer ??= new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				(entry.target as HTMLElement).dataset.reveal = 'shown';
				observer?.unobserve(entry.target);
			}
		},
		{ threshold: 0, rootMargin: '0px 0px -10% 0px' }
	);
	return observer;
}

/** Measure every section mounted in this pass before marking any, so the reads do not
 * alternate with writes and force a layout per section. Runs before the first paint. */
function flush(): void {
	const nodes = queued;
	queued = [];
	const below = nodes.filter((node) => node.getBoundingClientRect().top >= window.innerHeight);
	for (const node of below) {
		node.dataset.reveal = 'pending';
		shared().observe(node);
	}
}

export function reveal(node: HTMLElement) {
	if (typeof IntersectionObserver === 'undefined') return;
	if (queued.length === 0) queueMicrotask(flush);
	queued.push(node);
	return {
		destroy() {
			queued = queued.filter((n) => n !== node);
			observer?.unobserve(node);
		}
	};
}
