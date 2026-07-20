<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';

  export let items: string[] = [];
  export let placeholder = 'Add item...';
  /** Widen the list and drop the narrow max-width — for content-heavy lists like ingredients. */
  export let fullWidth = false;
  /** Show a drag handle and allow reordering rows — for lists where order matters. */
  export let reorderable = false;

  const dispatch = createEventDispatcher<{ change: string[] }>();
  let newItem = '';
  let newItemEl: HTMLInputElement | HTMLTextAreaElement;
  let dragIndex: number | null = null;
  let dragOverIndex: number | null = null;

  /** Decode HTML entities (e.g. "&frac12;" -> "½") for display; typed edits are stored as-is. */
  function decodeEntities(str: string): string {
    if (typeof document === 'undefined' || !str.includes('&')) return str;
    const el = document.createElement('textarea');
    el.innerHTML = str;
    return el.value;
  }

  /** Auto-grow a textarea to fit its content instead of clipping or scrolling long lines. */
  function autoGrow(el: HTMLTextAreaElement) {
    const resize = () => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; };
    // Defer the initial measurement a frame — at mount time the flex layout
    // hasn't settled yet, so scrollHeight would be measured against a
    // not-yet-resolved (near-zero) width and wrap every char onto its own line.
    requestAnimationFrame(resize);
    el.addEventListener('input', resize);
    return { destroy: () => el.removeEventListener('input', resize), update: resize };
  }

  function commit(next: string[]) {
    dispatch('change', next);
  }

  function updateItem(i: number, value: string) {
    const next = [...items];
    next[i] = value;
    commit(next);
  }

  function removeItem(i: number) {
    commit(items.filter((_, idx) => idx !== i));
  }

  async function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    commit([...items, trimmed]);
    newItem = '';
    await tick();
    newItemEl?.focus();
  }

  function onNewItemKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  }

  /** Backspace on an empty row's input removes that item and refocuses the previous one. */
  function onItemKeydown(e: KeyboardEvent, i: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      newItemEl?.focus();
    } else if (e.key === 'Backspace' && (e.currentTarget as HTMLInputElement | HTMLTextAreaElement).value === '') {
      e.preventDefault();
      removeItem(i);
    }
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  }

  function onDragStart(e: DragEvent, i: number) {
    dragIndex = i;
    e.dataTransfer?.setData('text/plain', String(i));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e: DragEvent, i: number) {
    e.preventDefault();
    dragOverIndex = i;
  }

  function onDrop(e: DragEvent, i: number) {
    e.preventDefault();
    if (dragIndex !== null) moveItem(dragIndex, i);
    dragIndex = null;
    dragOverIndex = null;
  }

  function onDragEnd() {
    dragIndex = null;
    dragOverIndex = null;
  }
</script>

<div class="string-list" class:string-list--wide={fullWidth}>
  {#each items as item, i (i)}
    <div
      class="string-list-row"
      class:string-list-row--drag-over={reorderable && dragOverIndex === i && dragIndex !== i}
      draggable={reorderable}
      on:dragstart={e => onDragStart(e, i)}
      on:dragover={e => onDragOver(e, i)}
      on:drop={e => onDrop(e, i)}
      on:dragend={onDragEnd}
    >
      {#if reorderable}
        <span class="string-list-handle" aria-hidden="true">⠿</span>
      {:else}
        <span class="string-list-bullet">–</span>
      {/if}
      {#if fullWidth}
        <textarea
          class="string-list-input string-list-textarea"
          rows="1"
          use:autoGrow
          value={decodeEntities(item)}
          on:input={e => updateItem(i, e.currentTarget.value)}
          on:keydown={e => onItemKeydown(e, i)}
        ></textarea>
      {:else}
        <input
          class="string-list-input"
          value={decodeEntities(item)}
          on:input={e => updateItem(i, e.currentTarget.value)}
          on:keydown={e => onItemKeydown(e, i)}
        />
      {/if}
      <button type="button" class="string-list-remove" on:click={() => removeItem(i)} aria-label="Remove item">×</button>
    </div>
  {/each}
  <div class="string-list-row string-list-row--new">
    <span class="string-list-bullet">+</span>
    {#if fullWidth}
      <textarea
        class="string-list-input string-list-textarea"
        rows="1"
        use:autoGrow
        bind:this={newItemEl}
        bind:value={newItem}
        on:keydown={onNewItemKeydown}
        {placeholder}
      ></textarea>
    {:else}
      <input
        class="string-list-input"
        bind:this={newItemEl}
        bind:value={newItem}
        on:keydown={onNewItemKeydown}
        {placeholder}
      />
    {/if}
  </div>
</div>

<style>
  .string-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 320px;
    border: 1px solid var(--admin-border);
    border-radius: 4px;
    background: var(--admin-surface);
    padding: 2px 8px;
  }
  .string-list--wide {
    max-width: none;
    width: 100%;
    padding: 4px 10px;
  }
  .string-list-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    border-bottom: 1px solid var(--admin-border);
  }
  .string-list--wide .string-list-row { align-items: flex-start; padding: 6px 0; }
  .string-list-row:last-child { border-bottom: none; }
  .string-list-row--drag-over { border-top: 2px solid var(--admin-orange); }
  .string-list-bullet {
    color: var(--admin-text-muted);
    font-size: 12px;
    width: 10px;
    flex-shrink: 0;
    text-align: center;
  }
  .string-list--wide .string-list-bullet { padding-top: 4px; }
  .string-list-handle {
    color: var(--admin-text-muted);
    font-size: 14px;
    width: 14px;
    flex-shrink: 0;
    text-align: center;
    cursor: grab;
    padding-top: 4px;
  }
  .string-list-input {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    background: transparent;
    border: none;
    padding: 0;
  }
  .string-list--wide .string-list-input { font-size: 14px; padding: 2px 0; }
  .string-list-input:focus { outline: none; }
  .string-list-textarea {
    resize: none;
    overflow: hidden;
    line-height: 1.5;
    font-family: inherit;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .string-list-remove {
    background: none;
    border: none;
    padding: 0 2px;
    line-height: 1;
    font-size: 15px;
    color: var(--admin-text-muted);
    opacity: 0.35;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.1s;
  }
  .string-list--wide .string-list-remove { margin-top: 3px; }
  .string-list-row:hover .string-list-remove,
  .string-list-remove:focus { opacity: 1; }
  .string-list-remove:hover { color: var(--admin-red); opacity: 1; }
</style>
