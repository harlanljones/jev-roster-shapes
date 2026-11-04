<script lang="ts">
	// D-62: the tagline reveal section that landing-page-design (B11) makes mandatory. Words start
	// in a muted tone and take the full ink one at a time, in reading order, as they cross a
	// trigger line. The skill asks for a 25 to 35% tone; this uses the opaque `ink-faint` token, about
	// 50% of the way from the ground to ink, the lowest that keeps even the transient muted state at
	// 3:1 for large text in both themes. Guards from this repository's contracts: nothing is muted until script runs,
	// reduced motion shows full colour at once, and the words stay one paragraph for screen readers.
	let { lines }: { lines: string[] } = $props();

	// Each word carries its own trailing space, so the words stay separate for screen readers and
	// line breaking even when a formatter tidies the whitespace between the spans.
	const words = $derived(
		lines.map((line, l) =>
			line.split(' ').map((text, w, all) => ({
				text: w < all.length - 1 || l < lines.length - 1 ? `${text} ` : text,
				key: `${l}-${w}`
			}))
		)
	);

	function arm(node: HTMLElement) {
		if (typeof IntersectionObserver === 'undefined') return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const spans = [...node.querySelectorAll<HTMLElement>('.word')];
		node.dataset.armed = 'true';
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						(entry.target as HTMLElement).dataset.on = 'true';
						observer.unobserve(entry.target);
					}
				}
			},
			{ rootMargin: '0px 0px -38% 0px' }
		);
		spans.forEach((span) => observer.observe(span));
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}
</script>

<p class="tagline" use:arm>
	{#each words as line, l (l)}
		<span class="line"
			>{#each line as word (word.key)}<span class="word">{word.text}</span>{/each}</span
		>
	{/each}
</p>

<style>
	.tagline {
		max-width: var(--hero-max);
		margin: 0;
		font-size: var(--text-5xl);
		line-height: var(--text-5xl--lh);
		font-weight: 600;
		letter-spacing: -0.03em;
		text-wrap: balance;
	}
	.line {
		display: block;
	}
	.line + .line {
		margin-top: var(--spacing-100);
	}
	.word {
		color: var(--ink);
	}
	:global(.tagline[data-armed='true']) .word {
		color: var(--ink-faint);
		transition: color var(--dur-move) var(--ease);
	}
	:global(.tagline[data-armed='true']) .word:global([data-on='true']) {
		color: var(--ink);
	}
	@media (max-width: 640px) {
		.tagline {
			font-size: var(--text-4xl);
			line-height: var(--text-4xl--lh);
		}
	}
</style>
