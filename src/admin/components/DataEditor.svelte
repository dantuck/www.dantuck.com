<script lang="ts">
  import { onMount } from 'svelte';
  import type { DataDetail, DataId } from '../lib/types';
  import JsonNode from './JsonNode.svelte';

  export let id: DataId;
  export let label: string;

  let data: unknown = null;
  let fileSha: string | undefined;
  let branch: string | undefined;
  let prNumber: number | undefined;
  let loading = true;
  let error = '';
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let publishStatus: 'idle' | 'publishing' | 'published' | 'error' = 'idle';
  let autosaveTimer: ReturnType<typeof setTimeout>;

  async function load() {
    loading = true;
    error = '';
    try {
      const res = await fetch(`/admin/api/data?id=${id}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const detail: DataDetail = await res.json();
      data = detail.data;
      fileSha = detail.fileSha;
      branch = detail.branch;
      prNumber = detail.prNumber;
    } catch (e) {
      error = `Failed to load ${label}: ${e}`;
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(save, 30_000);
  }

  function onRootChange(e: CustomEvent<unknown>) {
    data = e.detail;
    scheduleAutosave();
  }

  async function save() {
    saveStatus = 'saving';
    clearTimeout(autosaveTimer);
    try {
      const res = await fetch('/admin/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fileSha, data }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const result = await res.json();
      fileSha = result.fileSha;
      if (result.prNumber) prNumber = result.prNumber;
      if (result.branch) branch = result.branch;
      saveStatus = 'saved';
      setTimeout(() => saveStatus = 'idle', 3000);
    } catch {
      saveStatus = 'error';
    }
  }

  async function publish() {
    if (!prNumber) {
      await save();
      if (!prNumber) return;
    }
    publishStatus = 'publishing';
    try {
      const res = await fetch('/admin/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prNumber, title: `update ${label}` }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      publishStatus = 'published';
      setTimeout(() => publishStatus = 'idle', 4000);
    } catch {
      publishStatus = 'error';
    }
  }
</script>

<div class="data-editor-shell">
  <header class="meta-strip">
    <a href="/admin" class="back-link">← Dashboard</a>
    <span class="title">{label}</span>
    <span class="save-status" data-status={saveStatus}>
      {#if saveStatus === 'saving'}Saving...
      {:else if saveStatus === 'saved'}Saved ✓
      {:else if saveStatus === 'error'}Save failed
      {/if}
    </span>
    <div class="actions">
      <button class="btn-ghost" on:click={save}>Save Draft</button>
      <button class="btn-primary" on:click={publish} disabled={publishStatus === 'publishing'}>
        {publishStatus === 'publishing' ? 'Publishing…' : publishStatus === 'published' ? 'Published ✓' : prNumber ? 'Publish Now' : 'Save & Publish'}
      </button>
    </div>
  </header>

  <main class="data-body">
    {#if loading}
      <p class="state-msg">Loading...</p>
    {:else if error}
      <p class="state-msg error">{error}</p>
    {:else}
      <JsonNode value={data} on:change={onRootChange} />
    {/if}
  </main>
</div>

<style>
  .data-editor-shell { display: flex; flex-direction: column; min-height: 100vh; }

  .meta-strip {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 24px;
    background: var(--admin-surface);
    border-bottom: 1px solid var(--admin-border);
  }
  .back-link { font-size: 13px; color: var(--admin-text-muted); white-space: nowrap; }
  .back-link:hover { color: var(--admin-text); }
  .title { font-weight: 700; font-size: 15px; flex: 1; }
  .save-status { font-size: 12px; color: var(--admin-text-muted); }
  .save-status[data-status="saved"] { color: var(--admin-green); }
  .save-status[data-status="error"] { color: var(--admin-red); }
  .actions { display: flex; gap: 8px; }

  .data-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px max(24px, calc(50% - 400px));
    background: var(--admin-bg);
  }

  .state-msg { color: var(--admin-text-muted); font-size: 14px; }
  .state-msg.error { color: var(--admin-red); }

  .btn-danger {
    background: transparent;
    color: var(--admin-red);
    border: 1px solid var(--admin-red);
    border-radius: 5px;
    padding: 2px 8px;
    cursor: pointer;
  }
  .btn-danger:hover { background: var(--admin-red); color: #fff; }
</style>
