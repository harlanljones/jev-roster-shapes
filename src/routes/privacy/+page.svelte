<script lang="ts">
	import ProsePage from '$lib/app/ProsePage.svelte';
</script>

<svelte:head>
	<title>Privacy · Roster Shapes</title>
	<meta
		name="description"
		content="What Roster Shapes stores and which outside services a visit reaches."
	/>
</svelte:head>

<ProsePage
	title="What this site keeps"
	lead="This page describes what the code does. It is a plain statement of fact, not a reviewed legal document."
>
	<h2>No accounts, cookies or analytics</h2>
	<p>
		There is nothing to sign up for. The app sets no cookies and loads no analytics or tracking
		script.
	</p>
	<h2>What stays in your browser</h2>
	<ul>
		<li>
			Drafts you save in the workspace are kept in your browser’s IndexedDB storage for this site.
			They never leave your device unless you export a file. Clear this site’s data in your browser
			to delete them.
		</li>
		<li>
			When you acknowledge that a scenario uses public data, that choice is kept in session storage
			for the open tab and cleared when the tab closes.
		</li>
	</ul>
	<h2>Outside services a visit reaches</h2>
	<ul>
		<li>
			The site is hosted on Cloudflare Pages, which, like any web host, handles each request,
			including your IP address, to deliver the page.
		</li>
		<li>
			Player pages show a headshot loaded from MLB’s image service at img.mlbstatic.com, which
			receives an ordinary image request from your browser.
		</li>
		<li>Fonts and all other files are served from this site itself.</li>
	</ul>
	<h2>Questions</h2>
	<p>
		Open an issue on
		<a href="https://github.com/harlanljones/jev-roster-shapes/issues">the project’s GitHub</a>.
	</p>
</ProsePage>
