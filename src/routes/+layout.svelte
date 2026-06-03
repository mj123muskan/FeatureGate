<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	let { children } = $props();

	async function signOut() {
		await fetch('/api/admin/sign-out', { method: 'POST' });
		await invalidateAll();
		await goto('/');
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>FeatureGate</title>
</svelte:head>

<header class="topbar">
	<div class="wrap topbar-inner">
		<a href="/" class="brand">◆ FeatureGate</a>
		{#if page.data.admin}
			<button class="btn-ghost signout" onclick={signOut}>Sign out</button>
		{/if}
	</div>
</header>

<main class="wrap main">
	{@render children()}
</main>

<style>
	.topbar {
		background: white;
		border-bottom: 1px solid var(--line);
	}
	.topbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 56px;
	}
	.brand {
		font-weight: 800;
		font-size: 16px;
		color: var(--ink);
		letter-spacing: -0.01em;
	}
	.signout {
		padding: 7px 12px;
		border-radius: 9px;
		font-size: 13px;
		cursor: pointer;
	}
	.main {
		padding-top: 26px;
		padding-bottom: 60px;
	}
</style>
