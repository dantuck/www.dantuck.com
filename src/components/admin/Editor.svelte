<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { Crepe } from '@milkdown/crepe';
  import '@milkdown/crepe/theme/common/style.css';
  import '@milkdown/crepe/theme/classic-dark.css';
  import { listenerCtx } from '@milkdown/plugin-listener';
  import type { ArticleDetail } from '../../lib/admin/types';
  import type { ArticleFrontmatter } from '../../lib/admin/frontmatter';
  import { toSlug } from '../../lib/admin/slug';
  import PublishButton from './PublishButton.svelte';

  // Article state
  let slug: string | undefined;
  let article: ArticleDetail | null = null;
  let frontmatter: ArticleFrontmatter = { title: 'Untitled', author: 'Daniel' };
  let mdxImports = '';
  let body = '';
  let extra: string[] = [];
  let fileSha: string | undefined;
  let prNumber: number | undefined;
  let branch: string | undefined;
  let previewUrl: string | undefined;
  let loading = true;
  let error = '';

  // Save state
  let saveStatus: 'idle' | 'saving' | 'saved' | 'error' = 'idle';
  let autosaveTimer: ReturnType<typeof setTimeout>;

  // Editor
  let editorEl: HTMLDivElement;
  let crepe: Crepe | undefined;

  onMount(async () => {
    // Read slug from query param (edit page is /admin/edit?slug=...)
    if (typeof window !== 'undefined') {
      slug = new URLSearchParams(window.location.search).get('slug') ?? undefined;
    }

    if (slug) {
      try {
        const res = await fetch(`/admin/api/articles?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data: ArticleDetail = await res.json();
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

  export async function save() {
    saveStatus = 'saving';
    clearTimeout(autosaveTimer);

    const effectiveSlug = slug ?? `article/${toSlug(frontmatter.title)}`;
    const ext = mdxImports ? 'mdx' : 'md';
    const path = `src/pages/${effectiveSlug}/index.${ext}`;

    try {
      const res = await fetch('/admin/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: effectiveSlug,
          path,
          fileSha,
          frontmatter,
          imports: mdxImports,
          body,
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

  onDestroy(() => {
    clearTimeout(autosaveTimer);
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
        <input
          class="meta-input"
          value={frontmatter.tags?.join(', ') ?? ''}
          on:change={e => {
            frontmatter.tags = e.currentTarget.value.split(',').map(t => t.trim()).filter(Boolean);
            scheduleAutosave();
          }}
          placeholder="astro, webdev"
          style="width: 160px"
        />

        <label class="meta-label">Date</label>
        <input
          class="meta-input"
          bind:value={frontmatter.publishDate}
          on:change={scheduleAutosave}
          placeholder="27 Apr 2026 14:00 UTC"
          style="width: 180px"
        />

        <span class="save-status" data-status={saveStatus}>
          {#if saveStatus === 'saving'}Saving...
          {:else if saveStatus === 'saved'}Saved ✓
          {:else if saveStatus === 'error'}Save failed
          {/if}
        </span>
      </div>

      <div class="actions">
        {#if previewUrl}
          <a href={previewUrl} target="_blank" rel="noopener" class="btn-ghost">Preview ↗</a>
        {/if}
        <PublishButton
          {prNumber}
          title={frontmatter.title}
          publishDate={frontmatter.publishDate}
          {slug}
          path={slug ? `src/pages/${slug}/index.${mdxImports ? 'mdx' : 'md'}` : undefined}
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

<style>
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

  .save-status { font-size: 12px; color: var(--admin-text-muted); min-width: 70px; }
  .save-status[data-status="saved"] { color: var(--admin-green); }
  .save-status[data-status="error"] { color: var(--admin-red); }

  .actions { display: flex; gap: 8px; margin-left: auto; }

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
</style>
