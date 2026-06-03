<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let token = $state('');
	let signinErr = $state<string | null>(null);
	let busy = $state(false);
	let newName = $state('');

	async function signIn(e: Event) {
		e.preventDefault();
		if (!token.trim()) return;
		busy = true;
		signinErr = null;
		const res = await fetch('/api/admin/auth', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ token: token.trim() })
		});
		busy = false;
		if (res.ok) await invalidateAll();
		else signinErr = res.status === 403 ? 'Invalid admin token.' : 'Sign-in failed.';
	}

	async function createProject(e: Event) {
		e.preventDefault();
		if (!newName.trim()) return;
		busy = true;
		const res = await fetch('/api/admin/projects', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name: newName.trim() })
		});
		busy = false;
		if (res.ok) {
			const { project } = await res.json();
			newName = '';
			await goto(`/projects/${project.id}`);
		}
	}

	async function deleteProject(id: string, name: string) {
		if (!confirm(`Delete project "${name}" and all its flags?`)) return;
		await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
		await invalidateAll();
	}
</script>

{#if !page.data.admin}
	<div class="auth card">
		<h1>Sign in</h1>
		<p class="muted">Enter the admin token to manage feature flags.</p>
		{#if !data.configured}
			<p class="warn">
				No <code>ADMIN_TOKEN</code> is set on the server — set it in env to enable access.
			</p>
		{/if}
		<form onsubmit={signIn}>
			<input
				class="input"
				type="password"
				placeholder="Admin token"
				bind:value={token}
				disabled={!data.configured}
			/>
			{#if signinErr}<p class="err">{signinErr}</p>{/if}
			<button class="btn" type="submit" disabled={busy || !data.configured}>Sign in</button>
		</form>
	</div>
{:else}
	<div class="head">
		<h1>Projects</h1>
		<form class="create" onsubmit={createProject}>
			<input class="input" placeholder="New project name" bind:value={newName} />
			<button class="btn" type="submit" disabled={busy}>Create</button>
		</form>
	</div>

	{#if data.projects.length === 0}
		<p class="muted empty">No projects yet. Create one to start adding flags.</p>
	{:else}
		<div class="list">
			{#each data.projects as p (p.id)}
				<div class="row card">
					<a class="row-main" href={`/projects/${p.id}`}>
						<span class="row-name">{p.name}</span>
						<span class="row-id mono">{p.id}</span>
					</a>
					<a class="btn-ghost open" href={`/projects/${p.id}`}>Open</a>
					<button class="btn-danger del" onclick={() => deleteProject(p.id, p.name)}>Delete</button>
				</div>
			{/each}
		</div>
	{/if}
{/if}

<style>
	.auth {
		max-width: 380px;
		margin: 40px auto;
		padding: 26px 24px;
	}
	.auth h1 {
		margin: 0 0 4px;
		font-size: 24px;
	}
	.auth form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		margin-top: 16px;
	}
	.warn {
		font-size: 13px;
		background: #fff7ed;
		color: #9a3412;
		padding: 10px 12px;
		border-radius: 8px;
	}
	.err {
		color: var(--danger);
		font-size: 13px;
		margin: 0;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
	}
	.head h1 {
		margin: 0;
		font-size: 24px;
	}
	.create {
		display: flex;
		gap: 8px;
	}
	.create .input {
		width: 220px;
	}
	.empty {
		padding: 40px 0;
		text-align: center;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
	}
	.row-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		color: inherit;
	}
	.row-name {
		font-weight: 600;
		font-size: 15px;
	}
	.row-id {
		font-size: 11px;
		color: var(--faint);
	}
	.open,
	.del {
		padding: 8px 14px;
		border-radius: 9px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
</style>
