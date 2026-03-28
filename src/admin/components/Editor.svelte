<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { Crepe } from '@milkdown/crepe';
  import '@milkdown/crepe/theme/common/style.css';
  import '@milkdown/crepe/theme/classic-dark.css';
  import { listenerCtx } from '@milkdown/plugin-listener';
  import type { ArticleDetail, ArticleSummary } from '../lib/types';
  import type { ArticleFrontmatter } from '../lib/frontmatter';
  import { toSlug } from '../lib/slug';
  import { authHeaders, setAdminToken } from '../lib/auth';
  import PublishButton from './PublishButton.svelte';

  // Article state
  let slug: string | undefined;
  // layout path is relative to src/pages/article/{slug}/index.md (3 dirs up to layouts/)
  let frontmatter: ArticleFrontmatter = {
    title: 'Untitled',
    author: 'Daniel',
    layout: '../../../layouts/BlogPost.astro',
  };
  let mdxImports = '';
  let body = '';
  let extra: string[] = [];
  let fileSha: string | undefined;
  let prNumber: number | undefined;
  let branch: string | undefined;
  let previewUrl: string | undefined;
  let loading = true;
  let error = '';
  let authNeeded = false;
  let tokenInput = '';

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const HOURS = Array.from({length: 24}, (_, i) => i);
  const pad = (n: number) => String(n).padStart(2, '0');

  // User's timezone abbreviation (e.g. "CST", "EDT") shown next to the hour select
  const tzLabel = Intl.DateTimeFormat('en', { timeZoneName: 'short' })
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')?.value ?? 'local';

  /** Parse stored UTC string → local { dateVal: "2026-03-27", hour: 14 } for display */
  function parseDateParts(stored: string | undefined): { dateVal: string; hour: number } {
    if (!stored) return { dateVal: '', hour: 0 };
    const d = new Date(stored);
    if (isNaN(d.getTime())) return { dateVal: '', hour: 0 };
    return {
      dateVal: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      hour: d.getHours(),
    };
  }

  /** Combine local date string + local hour → stored format "27 Mar 2026 14:00 UTC" */
  function buildPublishDate(dateVal: string, hour: number): string {
    if (!dateVal) return '';
    const [year, month, day] = dateVal.split('-').map(Number);
    const d = new Date(year, month - 1, day, hour, 0); // local time
    return `${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}:00 UTC`;
  }

  $: dateParts = parseDateParts(frontmatter.publishDate);

  function onDateChange(e: Event) {
    const dateVal = (e.currentTarget as HTMLInputElement).value;
    frontmatter.publishDate = buildPublishDate(dateVal, dateParts.hour);
    scheduleAutosave();
  }

  function onHourChange(e: Event) {
    const hour = Number((e.currentTarget as HTMLSelectElement).value);
    frontmatter.publishDate = buildPublishDate(dateParts.dateVal, hour);
    scheduleAutosave();
  }

  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let autosaveTimer: ReturnType<typeof setTimeout>;
  $: fileExt = mdxImports ? 'mdx' : 'md';

  let allTags: string[] = [];
  let tagInput = '';
  let tagSuggestions: string[] = [];
  let tagHighlight = -1;
  let tagInputEl: HTMLInputElement;
  let tagBlurTimer: ReturnType<typeof setTimeout>;

  function onTagInput() {
    const val = tagInput.trim().toLowerCase();
    if (!val) { tagSuggestions = []; return; }
    const existing = frontmatter.tags ?? [];
    tagSuggestions = allTags
      .filter(t => t.toLowerCase().includes(val) && !existing.includes(t))
      .slice(0, 8);
    tagHighlight = -1;
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (!frontmatter.tags) frontmatter.tags = [];
    if (!frontmatter.tags.includes(trimmed)) {
      frontmatter.tags = [...frontmatter.tags, trimmed];
      scheduleAutosave();
    }
    tagInput = '';
    tagSuggestions = [];
    tagHighlight = -1;
  }

  function removeTag(tag: string) {
    frontmatter.tags = (frontmatter.tags ?? []).filter(t => t !== tag);
    scheduleAutosave();
  }

  function onTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (tagHighlight >= 0 && tagSuggestions[tagHighlight]) {
        addTag(tagSuggestions[tagHighlight]);
      } else if (tagInput.trim()) {
        addTag(tagInput.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      tagHighlight = Math.min(tagHighlight + 1, tagSuggestions.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      tagHighlight = Math.max(tagHighlight - 1, -1);
    } else if (e.key === 'Backspace' && !tagInput) {
      const tags = frontmatter.tags ?? [];
      if (tags.length) { frontmatter.tags = tags.slice(0, -1); scheduleAutosave(); }
    } else if (e.key === 'Escape') {
      tagSuggestions = [];
      tagHighlight = -1;
    }
  }

  function onTagBlur() {
    tagBlurTimer = setTimeout(() => { tagSuggestions = []; tagHighlight = -1; }, 150);
  }

  let editorEl: HTMLDivElement;
  let crepe: Crepe | undefined;

  onMount(async () => {
    // Read slug from query param (edit page is /admin/edit?slug=...)
    if (typeof window !== 'undefined') {
      slug = new URLSearchParams(window.location.search).get('slug') ?? undefined;
    }

    const [articleRes, allArticlesRes] = await Promise.all([
      slug ? fetch(`/admin/api/articles?slug=${encodeURIComponent(slug)}`, { headers: authHeaders() }) : Promise.resolve(null),
      fetch('/admin/api/articles', { headers: authHeaders() }),
    ]);

    if (articleRes?.status === 401 || allArticlesRes.status === 401) {
      authNeeded = true;
      loading = false;
      return;
    }

    if (articleRes) {
      try {
        if (!articleRes.ok) throw new Error(`${articleRes.status}`);
        const data: ArticleDetail = await articleRes.json();
        frontmatter = data.frontmatter;
        mdxImports = data.imports;
        body = data.body;
        extra = data.extra ?? [];
        fileSha = data.fileSha;
        prNumber = data.prNumber;
        branch = data.branch;
      } catch (e) {
        error = `Failed to load article: ${e}`;
      }
    }

    try {
      if (allArticlesRes.ok) {
        const all: ArticleSummary[] = await allArticlesRes.json();
        allTags = [...new Set(all.flatMap(a => a.tags ?? []))].sort();
      }
    } catch { /* tags autocomplete unavailable */ }

    loading = false;
    await tick();
    await initEditor();
  });

  async function initEditor() {
    if (!editorEl) return;
    crepe = new Crepe({ root: editorEl, defaultValue: body });
    await crepe.create();
    crepe.editor.action(ctx => {
      ctx.get(listenerCtx).markdownUpdated((_, md) => {
        body = md;
        scheduleAutosave();
      });
    });
  }

  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(save, 30_000);
  }

  /**
   * Milkdown serialises the body back to CommonMark and escapes characters that
   * are special in markdown but meaningful in MDX (JSX component tags and array
   * literals inside JSX expressions).  Undo those escapes before persisting.
   *   \<Foo …/>  →  <Foo …/>    (escaped opening angle bracket)
   *   {\[…]}     →  {[…]}       (escaped [ inside JSX expressions only)
   */
  function sanitizeBodyForMdx(raw: string): string {
    return raw
      .replace(/\\</g, '<')
      .replace(/\{\\?\[/g, '{[');
  }

  export async function save() {
    saveStatus = 'saving';
    clearTimeout(autosaveTimer);

    const effectiveSlug = slug ?? `article/${toSlug(frontmatter.title)}`;
    const path = `src/pages/${effectiveSlug}/index.${fileExt}`;

    try {
      const res = await fetch('/admin/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          slug: effectiveSlug,
          path,
          fileSha,
          frontmatter,
          imports: mdxImports,
          body: sanitizeBodyForMdx(body),
          extra,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();

      fileSha = data.fileSha;
      if (data.prNumber) prNumber = data.prNumber;
      if (data.branch) branch = data.branch;
      if (data.previewUrl) previewUrl = data.previewUrl;
      if (!slug) {
        slug = effectiveSlug;
        // Update URL to use query param (consistent with /admin/edit?slug=...)
        window.history.pushState({}, '', `/admin/edit?slug=${encodeURIComponent(effectiveSlug)}`);
      }
      saveStatus = 'saved';
      setTimeout(() => saveStatus = 'idle', 3000);
    } catch (e) {
      saveStatus = 'error';
    }
  }

  let showDeleteModal = false;
  let deleteConfirmText = '';
  let deleting = false;

  async function confirmDelete() {
    if (!slug || deleteConfirmText !== 'DELETE') return;
    deleting = true;
    const path = `src/pages/${slug}/index.${fileExt}`;
    const res = await fetch('/admin/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ slug, path, fileSha, branch: branch ?? 'master', prNumber }),
    });
    if (res.ok) {
      window.location.href = '/admin';
    } else {
      deleting = false;
      showDeleteModal = false;
      deleteConfirmText = '';
      saveStatus = 'error';
    }
  }

  function openDeleteModal() {
    deleteConfirmText = '';
    showDeleteModal = true;
  }

  function closeDeleteModal() {
    showDeleteModal = false;
    deleteConfirmText = '';
  }

  // Unpublish
  let showUnpublishModal = false;
  let unpublishRedirectTo = '';
  let unpublishing = false;

  $: isLive = !!slug && !frontmatter.draft &&
    !!frontmatter.publishDate &&
    new Date(frontmatter.publishDate) <= new Date();

  async function confirmUnpublish() {
    if (!slug) return;
    unpublishing = true;
    const path = `src/pages/${slug}/index.${fileExt}`;
    const res = await fetch('/admin/api/unpublish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        slug,
        path,
        fileSha,
        redirectTo: unpublishRedirectTo.trim() || undefined,
      }),
    });
    if (res.ok) {
      frontmatter.draft = true;
      showUnpublishModal = false;
      unpublishing = false;
      unpublishRedirectTo = '';
    } else {
      unpublishing = false;
      saveStatus = 'error';
    }
  }

  function submitToken() {
    if (!tokenInput) return;
    setAdminToken(tokenInput);
    tokenInput = '';
    authNeeded = false;
    // reload page to re-run onMount with new token
    window.location.reload();
  }

  onDestroy(() => {
    clearTimeout(autosaveTimer);
    clearTimeout(tagBlurTimer);
    crepe?.destroy();
  });

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  }

  async function handleImageDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5 MB.');
      return;
    }

    // Must be saved first to have a branch
    if (!branch) {
      await save();
      if (!branch) return;
    }

    const base64 = await fileToBase64(file);
    const effectiveSlug = slug ?? `article/${toSlug(frontmatter.title)}`;

    const res = await fetch('/admin/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: effectiveSlug,
        branch,
        filename: file.name,
        base64,
      }),
    });
    if (!res.ok) { alert('Image upload failed.'); return; }
    const { path: relativePath } = await res.json();

    // Convert to .mdx if needed
    const varName = relativePath.replace('./', '').replace(/[^a-zA-Z0-9]/g, '_');
    const newImport = `import ${varName} from '${relativePath}';`;

    if (!mdxImports.includes("import { Image } from 'astro:assets'")) {
      const existing = mdxImports.trim();
      mdxImports = existing
        ? `import { Image } from 'astro:assets';\n${existing}\n${newImport}`
        : `import { Image } from 'astro:assets';\n${newImport}`;
    } else if (!mdxImports.includes(newImport)) {
      mdxImports = `${mdxImports}\n${newImport}`;
    }

    // Insert raw MDX block into body at end
    body += `\n\n<Image src={${varName}} alt="" widths={[400, 800, 1300]} sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1300px" />`;

    // Trigger a save
    await save();
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]); // strip "data:image/...;base64,"
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if authNeeded}
  <div class="auth-gate">
    <form class="auth-form" on:submit|preventDefault={submitToken}>
      <p class="auth-label">Admin token required</p>
      <input
        class="auth-input"
        type="password"
        bind:value={tokenInput}
        placeholder="Enter admin token"
        autocomplete="current-password"
      />
      <button type="submit" class="btn-primary">Unlock</button>
    </form>
  </div>
{:else}
<div class="editor-shell">
  {#if loading}
    <div class="state-center">Loading...</div>
  {:else if error}
    <div class="state-center error">{error}</div>
  {:else}
    <!-- Metadata strip -->
    <header class="meta-strip">
      <a href="/admin" class="back-link">← Articles</a>

      <input
        class="title-input"
        bind:value={frontmatter.title}
        on:input={scheduleAutosave}
        placeholder="Article title..."
      />

      <div class="meta-fields">
        <label class="meta-label">Tags</label>
        <div class="tag-field">
          <div class="tag-input-wrap" on:click={() => tagInputEl?.focus()} role="group">
            {#each (frontmatter.tags ?? []) as tag}
              <span class="tag-chip">
                {tag}
                <button type="button" class="tag-remove" on:click|stopPropagation={() => removeTag(tag)}>×</button>
              </span>
            {/each}
            <input
              bind:this={tagInputEl}
              class="tag-text-input"
              bind:value={tagInput}
              on:input={onTagInput}
              on:keydown={onTagKeydown}
              on:blur={onTagBlur}
              placeholder={frontmatter.tags?.length ? '' : 'Add tags…'}
            />
          </div>
          {#if tagSuggestions.length > 0}
            <div class="tag-dropdown">
              {#each tagSuggestions as suggestion, i}
                <button
                  type="button"
                  class="tag-suggestion"
                  class:highlighted={i === tagHighlight}
                  on:mousedown|preventDefault={() => addTag(suggestion)}
                >{suggestion}</button>
              {/each}
            </div>
          {/if}
        </div>

        <label class="meta-label">Date</label>
        <input
          type="date"
          class="meta-input"
          value={dateParts.dateVal}
          on:change={onDateChange}
        />
        <select class="meta-input" value={dateParts.hour} on:change={onHourChange}>
          {#each HOURS as h}
            <option value={h}>{pad(h)}:00</option>
          {/each}
        </select>
        <span class="meta-tz">{tzLabel}</span>

        <span class="save-status" data-status={saveStatus}>
          {#if saveStatus === 'saving'}Saving...
          {:else if saveStatus === 'saved'}Saved ✓
          {:else if saveStatus === 'error'}Save failed
          {/if}
        </span>
      </div>

      <div class="actions">
        {#if isLive}
          <button class="btn-ghost" on:click={() => showUnpublishModal = true}>Unpublish</button>
        {/if}
        {#if slug}
          <button class="btn-danger" on:click={openDeleteModal}>Delete</button>
        {/if}
        {#if previewUrl}
          <a href={previewUrl} target="_blank" rel="noopener" class="btn-ghost">Preview ↗</a>
        {/if}
        <PublishButton
          {prNumber}
          title={frontmatter.title}
          publishDate={frontmatter.publishDate}
          {slug}
          path={slug ? `src/pages/${slug}/index.${fileExt}` : undefined}
          {branch}
          onSave={save}
        />
      </div>
    </header>

    <!-- Milkdown editor -->
    <div
      class="editor-body"
      bind:this={editorEl}
      on:dragover|preventDefault
      on:drop={handleImageDrop}
    ></div>

    <!-- Status bar -->
    <footer class="status-bar">
      {#if branch}
        <span>branch: {branch}</span>
        <span>·</span>
      {/if}
      <span class="save-status-text" data-status={saveStatus}>
        {saveStatus === 'saved' ? 'saved' : saveStatus === 'saving' ? 'saving...' : ''}
      </span>
    </footer>
  {/if}
</div>

{#if showUnpublishModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={() => showUnpublishModal = false}>
    <div class="modal" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="unpublish-modal-title">
      <h2 id="unpublish-modal-title" class="modal-title modal-title--warn">Unpublish article</h2>
      <p class="modal-body">
        This will mark <strong>{frontmatter.title}</strong> as a draft and take it offline on the next deploy.<br /><br />
        Optionally set a redirect so existing links don't break.
      </p>
      <label class="modal-label" for="redirect-input">Redirect to <span class="modal-optional">(optional)</span></label>
      <input
        id="redirect-input"
        class="modal-input"
        bind:value={unpublishRedirectTo}
        placeholder="/"
        autocomplete="off"
        on:keydown={e => { if (e.key === 'Enter') confirmUnpublish(); if (e.key === 'Escape') showUnpublishModal = false; }}
      />
      <div class="modal-actions">
        <button class="btn-ghost" on:click={() => showUnpublishModal = false}>Cancel</button>
        <button
          class="btn-warn"
          disabled={unpublishing}
          on:click={confirmUnpublish}
        >{unpublishing ? 'Unpublishing…' : 'Unpublish'}</button>
      </div>
    </div>
  </div>
{/if}

{#if showDeleteModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="modal-backdrop" on:click={closeDeleteModal}>
    <div class="modal" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      <h2 id="delete-modal-title" class="modal-title">Delete article</h2>
      <p class="modal-body">
        This will permanently delete <strong>{frontmatter.title}</strong>.<br />
        Type <strong>DELETE</strong> to confirm.
      </p>
      <input
        class="modal-input"
        bind:value={deleteConfirmText}
        placeholder="DELETE"
        autocomplete="off"
        spellcheck="false"
        on:keydown={e => { if (e.key === 'Enter' && deleteConfirmText === 'DELETE') confirmDelete(); if (e.key === 'Escape') closeDeleteModal(); }}
      />
      <div class="modal-actions">
        <button class="btn-ghost" on:click={closeDeleteModal}>Cancel</button>
        <button
          class="btn-danger"
          disabled={deleteConfirmText !== 'DELETE' || deleting}
          on:click={confirmDelete}
        >{deleting ? 'Deleting…' : 'Delete'}</button>
      </div>
    </div>
  </div>
{/if}
{/if}

<style>
  .auth-gate {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--admin-bg);
  }
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: 8px;
    padding: 32px;
    width: 300px;
  }
  .auth-label { font-size: 14px; color: var(--admin-text); font-weight: 600; margin: 0; }
  .auth-input { font-size: 14px; padding: 8px 10px; }

  .editor-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

  .state-center {
    display: flex; align-items: center; justify-content: center;
    flex: 1; color: var(--admin-text-muted);
  }
  .state-center.error { color: var(--admin-red); }

  .meta-strip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    background: var(--admin-surface);
    border-bottom: 1px solid var(--admin-border);
    flex-wrap: wrap;
  }
  .back-link { font-size: 13px; color: var(--admin-text-muted); white-space: nowrap; }
  .back-link:hover { color: var(--admin-text); }

  .title-input {
    flex: 1;
    min-width: 160px;
    font-size: 15px;
    font-weight: 600;
    background: transparent;
    border: none;
    border-bottom: 1px solid transparent;
    border-radius: 0;
    padding: 4px 0;
    color: var(--admin-text);
  }
  .title-input:focus { border-bottom-color: var(--admin-orange); outline: none; }

  .meta-fields {
    display: flex; align-items: center; gap: 8px;
    flex-wrap: wrap;
  }
  .meta-label { font-size: 11px; color: var(--admin-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .meta-input { font-size: 13px; padding: 3px 8px; }
  .meta-tz { font-size: 12px; color: var(--admin-text-muted); }

  .tag-field { position: relative; }
  .tag-input-wrap {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    min-width: 160px;
    max-width: 300px;
    padding: 3px 6px;
    border: 1px solid var(--admin-border);
    border-radius: 4px;
    background: var(--admin-surface);
    cursor: text;
  }
  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: var(--admin-surface-2);
    border-radius: 3px;
    padding: 1px 5px;
    font-size: 12px;
    color: var(--admin-text);
    white-space: nowrap;
  }
  .tag-remove {
    background: none;
    border: none;
    padding: 0;
    line-height: 1;
    font-size: 14px;
    color: var(--admin-text-muted);
    cursor: pointer;
  }
  .tag-remove:hover { color: var(--admin-red); }
  .tag-text-input {
    flex: 1;
    min-width: 80px;
    border: none;
    background: transparent;
    outline: none;
    font-size: 13px;
    color: var(--admin-text);
    padding: 0;
  }
  .tag-dropdown {
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    z-index: 100;
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: 4px;
    min-width: 160px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
  .tag-suggestion {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    padding: 6px 10px;
    font-size: 13px;
    color: var(--admin-text);
    cursor: pointer;
  }
  .tag-suggestion:hover, .tag-suggestion.highlighted {
    background: var(--admin-surface-2);
    color: var(--admin-orange);
  }

  .save-status { font-size: 12px; color: var(--admin-text-muted); min-width: 70px; }
  .save-status[data-status="saved"] { color: var(--admin-green); }
  .save-status[data-status="error"] { color: var(--admin-red); }

  .actions { display: flex; gap: 8px; margin-left: auto; align-items: center; }

  .delete-confirm { display: flex; align-items: center; gap: 6px; }
  .delete-confirm-label { font-size: 12px; color: var(--admin-red); white-space: nowrap; }

  .btn-danger {
    background: transparent;
    color: var(--admin-red);
    border: 1px solid var(--admin-red);
    border-radius: 5px;
    padding: 6px 14px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .btn-danger:hover { background: var(--admin-red); color: #fff; }

  .editor-body {
    flex: 1;
    overflow-y: auto;
    padding: 32px max(32px, calc(50% - 400px));
    background: var(--admin-bg);
  }

  /* Crepe editor — blend into admin shell */
  :global(.milkdown) {
    min-height: 400px;
    background: transparent !important;
  }
  :global(.milkdown-menu) { background: var(--admin-surface) !important; }
  :global(.editor-frame) { background: transparent !important; }

  .status-bar {
    display: flex; gap: 8px;
    padding: 6px 20px;
    background: var(--admin-surface);
    border-top: 1px solid var(--admin-border);
    font-size: 11px;
    color: var(--admin-text-muted);
    font-family: var(--admin-mono);
  }
  .save-status-text[data-status="saved"] { color: var(--admin-green); }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--admin-surface);
    border: 1px solid var(--admin-border);
    border-radius: 10px;
    padding: 28px 32px;
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal-title { font-size: 16px; font-weight: 700; color: var(--admin-red); }
  .modal-title--warn { color: var(--admin-orange); }
  .modal-label { font-size: 12px; color: var(--admin-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .modal-optional { font-weight: 400; text-transform: none; }

  .modal-body { font-size: 14px; color: var(--admin-text-muted); line-height: 1.6; }
  .modal-body strong { color: var(--admin-text); }

  .modal-input {
    font-size: 14px;
    padding: 8px 12px;
    width: 100%;
    letter-spacing: 0.05em;
  }

  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; }

  .delete-confirm { display: flex; align-items: center; gap: 6px; }
  .delete-confirm-label { font-size: 12px; color: var(--admin-red); white-space: nowrap; }

  .btn-danger {
    background: transparent;
    color: var(--admin-red);
    border: 1px solid var(--admin-red);
    border-radius: 5px;
    padding: 6px 14px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .btn-danger:hover:not(:disabled) { background: var(--admin-red); color: #fff; }
  .btn-danger:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-warn {
    background: transparent;
    color: var(--admin-orange);
    border: 1px solid var(--admin-orange);
    border-radius: 5px;
    padding: 6px 14px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .btn-warn:hover:not(:disabled) { background: var(--admin-orange); color: #fff; }
  .btn-warn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
