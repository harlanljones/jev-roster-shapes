import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { todayIso } from '$lib/app/season-timeline';
import { currentSlug } from '$lib/storylines/registry';

// D-60: `/` opens on the decision matching the current date — the latest pin
// whose event date has arrived — the way a refreshed snapshot moves its as-of
// date. The season index lives at `/decisions` (D-49). The app renders only in
// the browser (D-13), so this redirect runs client-side on first load.
export const load = () => {
	redirect(307, resolve('/scenario/[slug]', { slug: currentSlug(todayIso()) }));
};
