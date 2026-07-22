<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { Crepe } from '@milkdown/crepe';
  import '@milkdown/crepe/theme/common/style.css';
  import '@milkdown/crepe/theme/classic-dark.css';
  import { listenerCtx } from '@milkdown/plugin-listener';
  import type { DataDetail, DataId } from '../lib/types';
  import type { Frontmatter } from '../lib/frontmatter';

  export let id: DataId;
  export let label: string;

  let frontmatter: Frontmatter = { title: label };
  let body = '';
  let fileSha: string | undefined;
  let branch: string | undefined;
  let prNumber: number | undefined;
  let loading = true;
  let error = '';
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let publishStatus: 'idle' | 'publishing' | 'published' | 'error' = 'idle';
  let autosaveTimer: ReturnType<typeof setTimeout>;

  let editorEl: HTMLDivElement;
  let crepe: Crepe | undefined;
  let editorReady = false; // gates markdownUpdated to ignore init-time normalization

  onMount(async () => {
    loading = true;
    error = '';
    try {
      const res = await fetch(`/admin/api/data?id=${id}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const detail: DataDetail = await res.json();
      if (detail.format !== 'markdown') throw new Error(`Expected markdown format for "${id}"`);
      frontmatter = detail.frontmatter;
      body = detail.body;
      fileSha = detail.fileSha;
      branch = detail.branch;
      prNumber = detail.prNumber;
    } catch (e) {
      error = `Failed to load ${label}: ${e}`;
    } finally {
      loading = false;
      await tick();
      await initEditor();
    }
  });

  async function initEditor() {
    if (!editorEl) return;
    crepe = new Crepe({ root: editorEl, defaultValue: body });
    await crepe.create();
    crepe.editor.action(ctx => {
      ctx.get(listenerCtx).markdownUpdated((_, md) => {
        if (!editorReady) return; // ignore normalization fired during initialization
        body = md;
        scheduleAutosave();
      });
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    editorReady = true;
  }

  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(save, 30_000);
  }

  async function save() {
    saveStatus = 'saving';
    clearTimeout(autosaveTimer);
    try {
      const res = await fetch('/admin/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fileSha, frontmatter, body }),
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

  onDestroy(() => {
    clearTimeout(autosaveTimer);
    crepe?.destroy();
  });
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
      <div class="fields">
        <label class="field-label" for="title-input">Title</label>
        <input
          id="title-input"
          class="field-input"
          bind:value={frontmatter.title}
          on:input={scheduleAutosave}
        />
        <label class="field-label" for="description-input">Description <span class="hint">(meta description, social previews, search results)</span></label>
        <textarea
          id="description-input"
          class="field-input"
          rows="2"
          bind:value={frontmatter.description}
          on:input={scheduleAutosave}
        ></textarea>
      </div>

      <div
        class="editor-body"
        bind:this={editorEl}
        role="region"
        aria-label="About page editor"
      ></div>
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
    padding: 24px max(24px, calc(50% - 400px));
    background: var(--admin-bg);
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--admin-border);
  }
  .field-label {
    font-size: 11px;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 10px;
  }
  .field-label:first-child { margin-top: 0; }
  .hint { text-transform: none; font-weight: 400; letter-spacing: normal; }
  .field-input {
    font-size: 14px;
    font-family: inherit;
    padding: 6px 8px;
    width: 100%;
    resize: vertical;
  }

  .editor-body { min-height: 400px; }

  .state-msg { color: var(--admin-text-muted); font-size: 14px; }
  .state-msg.error { color: var(--admin-red); }

  :global(.milkdown) {
    min-height: 400px;
    background: transparent !important;
  }
  :global(.milkdown-menu) { background: var(--admin-surface) !important; }
  :global(.editor-frame) { background: transparent !important; }

  .btn-ghost {
    background: transparent;
    color: var(--admin-text);
    border: 1px solid var(--admin-border);
    border-radius: 5px;
    padding: 6px 14px;
    font-size: 14px;
    cursor: pointer;
  }
  .btn-ghost:hover { background: var(--admin-surface-2); }

  .btn-primary {
    background: var(--admin-orange);
    color: #fff;
    font-weight: 600;
    border: none;
    border-radius: 5px;
    padding: 6px 14px;
    font-size: 14px;
    cursor: pointer;
  }
  .btn-primary:hover:not(:disabled) { background: var(--admin-orange-hover); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
