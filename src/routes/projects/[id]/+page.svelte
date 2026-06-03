<script lang="ts">
	import { untrack } from 'svelte';
	import { FLAG_TYPES, type Flag, type FlagType } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let flags = $state<Flag[]>(untrack(() => [...data.flags]));
	const base = $derived(`${data.origin}/api/v1/flags`);

	// add-flag form
	let nk = $state('');
	let nt = $state<FlagType>('boolean');
	let nd = $state('');
	let addErr = $state<string | null>(null);
	let jsonErr = $state<Record<string, boolean>>({});

	const api = (path: string, method: string, body?: unknown) =>
		fetch(path, {
			method,
			headers: body ? { 'content-type': 'application/json' } : {},
			body: body ? JSON.stringify(body) : undefined
		});

	async function patch(flag: Flag, patchBody: Record<string, unknown>) {
		const res = await api(
			`/api/admin/projects/${data.project.id}/flags/${encodeURIComponent(flag.key)}`,
			'PATCH',
			patchBody
		);
		if (res.ok) {
			const { flag: updated } = await res.json();
			const i = flags.findIndex((f) => f.key === flag.key);
			if (i >= 0) flags[i] = updated;
		}
		return res.ok;
	}

	function toggleEnabled(flag: Flag) {
		patch(flag, { enabled: !flag.enabled });
	}
	function setBool(flag: Flag, v: boolean) {
		patch(flag, { value: v });
	}
	function commitText(flag: Flag, raw: string) {
		patch(flag, { value: flag.type === 'number' ? Number(raw) : raw });
	}
	async function commitJson(flag: Flag, raw: string) {
		jsonErr[flag.key] = false;
		const ok = await patch(flag, { value: raw });
		if (!ok) jsonErr[flag.key] = true;
	}

	async function addFlag(e: Event) {
		e.preventDefault();
		addErr = null;
		const res = await api(`/api/admin/projects/${data.project.id}/flags`, 'POST', {
			key: nk.trim(),
			type: nt,
			description: nd.trim()
		});
		if (res.ok) {
			const { flag } = await res.json();
			flags = [...flags, flag];
			nk = '';
			nd = '';
			nt = 'boolean';
		} else {
			const e = await res.json().catch(() => ({}));
			addErr = e?.message || 'Could not add flag';
		}
	}

	async function removeFlag(flag: Flag) {
		if (!confirm(`Delete flag "${flag.key}"?`)) return;
		const res = await api(
			`/api/admin/projects/${data.project.id}/flags/${encodeURIComponent(flag.key)}`,
			'DELETE'
		);
		if (res.ok) flags = flags.filter((f) => f.key !== flag.key);
	}

	let copied = $state(false);
	function copyKey() {
		navigator.clipboard?.writeText(data.project.apiKey);
		copied = true;
		setTimeout(() => (copied = false), 1200);
	}
</script>

<a href="/" class="back muted">← Projects</a>
<h1 class="title">{data.project.name}</h1>

<div class="card integ">
	<div class="integ-row">
		<span class="lbl">Read API key</span>
		<code class="key">{data.project.apiKey}</code>
		<button class="btn-ghost copy" onclick={copyKey}>{copied ? 'Copied' : 'Copy'}</button>
	</div>
	<div class="snippet">
		<span class="lbl">Fetch flags (any language)</span>
		<pre>curl -H "x-api-key: {data.project.apiKey}" {base}</pre>
	</div>
</div>

<div class="head">
	<h2>Flags</h2>
	<form class="add" onsubmit={addFlag}>
		<input class="input k" placeholder="flag.key" bind:value={nk} />
		<select class="input t" bind:value={nt}>
			{#each FLAG_TYPES as t (t)}<option value={t}>{t}</option>{/each}
		</select>
		<input class="input d" placeholder="description (optional)" bind:value={nd} />
		<button class="btn" type="submit">Add</button>
	</form>
</div>
{#if addErr}<p class="err">{addErr}</p>{/if}

{#if flags.length === 0}
	<p class="muted empty">No flags yet — add one above.</p>
{:else}
	<div class="list">
		{#each flags as flag (flag.key)}
			<div class="card flag">
				<button
					class="switch"
					class:on={flag.enabled}
					aria-label="enabled"
					onclick={() => toggleEnabled(flag)}><span class="knob"></span></button
				>
				<div class="flag-main">
					<div class="flag-top">
						<code class="flag-key">{flag.key}</code>
						<span class="badge">{flag.type}</span>
						{#if flag.description}<span class="flag-desc muted">{flag.description}</span>{/if}
					</div>
					<div class="flag-val">
						{#if flag.type === 'boolean'}
							<div class="seg">
								<button class="seg-btn" class:active={flag.value === true} onclick={() => setBool(flag, true)}>true</button>
								<button class="seg-btn" class:active={flag.value === false} onclick={() => setBool(flag, false)}>false</button>
							</div>
						{:else if flag.type === 'number'}
							<input
								class="input val"
								type="number"
								value={flag.value as number}
								onchange={(e) => commitText(flag, e.currentTarget.value)}
							/>
						{:else if flag.type === 'string'}
							<input
								class="input val"
								value={flag.value as string}
								onchange={(e) => commitText(flag, e.currentTarget.value)}
							/>
						{:else}
							<textarea
								class="input val json"
								class:bad={jsonErr[flag.key]}
								rows="2"
								onchange={(e) => commitJson(flag, e.currentTarget.value)}
								>{JSON.stringify(flag.value, null, 2)}</textarea
							>
						{/if}
					</div>
				</div>
				<button class="btn-danger del" onclick={() => removeFlag(flag)}>Delete</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.back {
		font-size: 13px;
	}
	.title {
		font-size: 26px;
		margin: 8px 0 18px;
	}
	.integ {
		padding: 16px 18px;
		margin-bottom: 26px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.lbl {
		display: block;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--faint);
		margin-bottom: 6px;
	}
	.integ-row {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.integ-row .lbl {
		margin: 0;
	}
	.key {
		flex: 1;
		min-width: 0;
		font-size: 13px;
		background: var(--bg);
		padding: 8px 10px;
		border-radius: 8px;
		overflow-x: auto;
		white-space: nowrap;
	}
	.copy {
		padding: 7px 12px;
		border-radius: 8px;
		font-size: 13px;
		cursor: pointer;
	}
	.snippet pre {
		margin: 0;
		background: #0e1117;
		color: #d6deeb;
		padding: 12px 14px;
		border-radius: 10px;
		font-size: 12.5px;
		overflow-x: auto;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		margin-bottom: 14px;
		flex-wrap: wrap;
	}
	.head h2 {
		margin: 0;
		font-size: 18px;
	}
	.add {
		display: flex;
		gap: 8px;
	}
	.add .k {
		width: 150px;
	}
	.add .t {
		width: 110px;
	}
	.add .d {
		width: 180px;
	}
	.err {
		color: var(--danger);
		font-size: 13px;
	}
	.empty {
		padding: 36px 0;
		text-align: center;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.flag {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 14px 16px;
	}
	.flag-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.flag-top {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.flag-key {
		font-size: 14px;
		font-weight: 600;
	}
	.flag-desc {
		font-size: 12px;
	}
	.val {
		max-width: 360px;
	}
	.json {
		font-family: var(--mono);
		font-size: 12px;
		width: 100%;
		max-width: 100%;
		resize: vertical;
	}
	.json.bad {
		border-color: var(--danger);
	}
	.seg {
		display: flex;
		gap: 6px;
	}
	.seg-btn {
		border: 1px solid var(--line);
		background: white;
		padding: 6px 14px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 600;
		color: var(--mute);
		cursor: pointer;
	}
	.seg-btn.active {
		border-color: var(--accent);
		background: var(--accent-soft);
		color: var(--accent);
	}
	.del {
		padding: 8px 14px;
		border-radius: 9px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		flex-shrink: 0;
	}
</style>
