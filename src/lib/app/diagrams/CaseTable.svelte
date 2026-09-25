<script lang="ts">
	import { GRADE_TEXT, SLOT_ROLES, grade, type CaseView, type Pool } from '../shape-case';

	// The case as a table: the same pieces, fits and runs for screen readers
	// and for anyone who wants the numbers straight.
	let { pool, view, pinned }: { pool: Pool; view: CaseView; pinned: string | null } = $props();

	const rows = $derived([
		...SLOT_ROLES.flatMap((role) => {
			const id = view.lineup[role];
			const p = id ? pool.get(id) : undefined;
			return p ? [{ slot: role, p, fit: GRADE_TEXT[grade(p, role)] }] : [];
		}),
		...view.bench.flatMap((id) => {
			const p = pool.get(id);
			return p ? [{ slot: 'Tray', p, fit: '—' }] : [];
		})
	]);
	const lineupPa = $derived(
		SLOT_ROLES.reduce((s, role) => {
			const p = view.lineup[role] ? pool.get(view.lineup[role]) : undefined;
			return s + (p ? p.pa.L + p.pa.R : 0);
		}, 0)
	);
</script>

<div class="case-table">
	<table>
		<caption>Every piece in the case, lineup first, then the bench tray</caption>
		<thead>
			<tr>
				<th scope="col">Slot</th>
				<th scope="col">Player</th>
				<th scope="col">Shape</th>
				<th scope="col">Fit</th>
				<th scope="col">Bats</th>
				<th scope="col">Eligible</th>
				<th scope="col" class="n">2026 R/PA</th>
				<th scope="col" class="n">2026 PA</th>
				<th scope="col" class="n">Runs</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as { slot, p, fit } (p.id)}
				<tr>
					<td>{slot}</td>
					<td>{p.name}</td>
					<td>{p.shape}</td>
					<td>{fit}</td>
					<td>{p.bats}</td>
					<td>{p.elig.join('/') || '—'}</td>
					<td class="n">{p.seasonRateText ?? 'unavailable'}</td>
					<td class="n">{p.split ? Math.round(p.pa.L + p.pa.R) : 'unavailable'}</td>
					<td class="n">{p.runs == null ? 'unavailable' : p.runs.toFixed(1)}</td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr>
				<th scope="row" colspan="7">Lineup total, actual 2026 (display layer)</th>
				<td class="n">{Math.round(lineupPa)}</td>
				<td class="n">{view.runs == null ? 'unavailable' : view.runs.toFixed(1)}</td>
			</tr>
			<tr>
				<th scope="row" colspan="7">Pinned 10-game engine total (assumed 390 PA)</th>
				<td class="n">390</td>
				<td class="n">{pinned ?? 'unavailable'}</td>
			</tr>
		</tfoot>
	</table>
</div>

<style>
	.case-table {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	caption {
		padding-bottom: 0.5rem;
		color: var(--ink-soft);
		text-align: left;
	}
	th,
	td {
		border-bottom: 1px solid var(--rule);
		padding: 0.4rem 0.6rem;
		text-align: left;
		white-space: nowrap;
	}
	thead th {
		color: var(--ink-soft);
		font-weight: 600;
	}
	.n {
		font-family: var(--mono);
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	tfoot th {
		font-weight: 600;
	}
</style>
