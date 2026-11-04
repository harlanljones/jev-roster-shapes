// D-62: sections rise 32px and fade in once as they enter the viewport (ai-design-skills,
// landing-page-design B7). Applied to section containers only — never to a number, a piece or
// a bar. An element in the first screen is left alone, and nothing is hidden until script is
// running, so a script failure, a print or a screenshot of the first screen shows everything.
export function reveal(node: HTMLElement) {
	if (typeof IntersectionObserver === 'undefined') return;
	if (node.getBoundingClientRect().top < window.innerHeight) return;
	node.dataset.reveal = 'pending';
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries.some((entry) => entry.isIntersecting)) {
				node.dataset.reveal = 'shown';
				observer.disconnect();
			}
		},
		{ threshold: 0.15 }
	);
	observer.observe(node);
	return {
		destroy() {
			observer.disconnect();
		}
	};
}
