import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { CURRENT_SLUG } from '$lib/storylines/registry';

// D-49: `/` opens on the current decision, the Wild Card roster; the season
// index moved to `/decisions`. The app renders only in the browser (D-13), so
// this redirect runs client-side on first load.
export const load = () => {
	redirect(307, resolve('/scenario/[slug]', { slug: CURRENT_SLUG }));
};
