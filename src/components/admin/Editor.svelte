<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { Editor, rootCtx, defaultValueCtx, editorViewOptionsCtx } from '@milkdown/core';
  import { commonmark } from '@milkdown/preset-commonmark';
  import { history as milkdownHistory } from '@milkdown/plugin-history';
  import { listener, listenerCtx } from '@milkdown/plugin-listener';
  import { block } from '@milkdown/plugin-block';
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
  let editor: Editor | undefined;

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
    editor = await Editor.make()
      .config(ctx => {
        ctx.set(rootCtx, editorEl);
        ctx.set(defaultValueCtx, body);
        ctx.update(editorViewOptionsCtx, prev => ({
          ...prev,
          attributes: { class: 'milkdown-editor', spellcheck: 'true' },
        }));
      })
      .use(commonmark)
      .use(milkdownHistory)
      .use(block)
      .use(
        listener.configure(listenerCtx, {
          markdown(getMarkdown) {
            body = getMarkdown();
            scheduleAutosave();
          },
        })
      )
      .create();
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
    editor?.destroy();
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

  /* Milkdown editor overrides */
  :global(.milkdown-editor) {
    font-family: var(--admin-font);
    font-size: 16px;
    color: var(--admin-text);
    line-height: 1.7;
    outline: none;
    min-height: 400px;
  }
  :global(.milkdown-editor h1) { font-size: 2em; font-weight: 700; margin: 1em 0 0.5em; color: #fff; }
  :global(.milkdown-editor h2) { font-size: 1.5em; font-weight: 600; margin: 1em 0 0.5em; color: #fff; }
  :global(.milkdown-editor h3) { font-size: 1.25em; font-weight: 600; margin: 0.8em 0 0.4em; color: #fff; }
  :global(.milkdown-editor p)  { margin: 0 0 1em; }
  :global(.milkdown-editor code) { background: var(--admin-surface-2); padding: 2px 6px; border-radius: 4px; font-family: var(--admin-mono); font-size: 0.9em; }
  :global(.milkdown-editor pre) { background: var(--admin-surface-2); border-radius: 8px; padding: 16px; overflow-x: auto; }
  :global(.milkdown-editor blockquote) { border-left: 3px solid var(--admin-orange); padding-left: 16px; color: var(--admin-text-muted); margin: 0 0 1em; }
  :global(.milkdown-editor a) { color: var(--admin-orange); }

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
