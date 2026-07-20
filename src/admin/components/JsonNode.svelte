<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import JsonNode from './JsonNode.svelte';

  export let value: unknown;
  export let label = '';
  export let depth = 0;

  const dispatch = createEventDispatcher<{ change: unknown }>();

  function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
  }

  function setKey(key: string, newVal: unknown) {
    dispatch('change', { ...(value as Record<string, unknown>), [key]: newVal });
  }

  function setIndex(i: number, newVal: unknown) {
    const arr = [...(value as unknown[])];
    arr[i] = newVal;
    dispatch('change', arr);
  }

  function removeIndex(i: number) {
    const arr = (value as unknown[]).filter((_, idx) => idx !== i);
    dispatch('change', arr);
  }

  function emptyLike(sample: unknown): unknown {
    if (Array.isArray(sample)) return [];
    if (isPlainObject(sample)) {
      return Object.fromEntries(Object.keys(sample).map(k => [k, emptyLike((sample as Record<string, unknown>)[k])]));
    }
    if (typeof sample === 'number') return 0;
    if (typeof sample === 'boolean') return false;
    return '';
  }

  function addItem() {
    const arr = value as unknown[];
    const sample = arr.length > 0 ? arr[arr.length - 1] : '';
    dispatch('change', [...arr, emptyLike(sample)]);
  }

  function onStringInput(e: Event) {
    dispatch('change', (e.currentTarget as HTMLInputElement).value);
  }
  function onTextareaInput(e: Event) {
    dispatch('change', (e.currentTarget as HTMLTextAreaElement).value);
  }
  function onNumberInput(e: Event) {
    const n = Number((e.currentTarget as HTMLInputElement).value);
    dispatch('change', Number.isNaN(n) ? 0 : n);
  }
  function onBoolInput(e: Event) {
    dispatch('change', (e.currentTarget as HTMLInputElement).checked);
  }
</script>

{#if Array.isArray(value)}
  <div class="json-array" style="--depth: {depth}">
    {#if label}<div class="json-label">{label}</div>{/if}
    {#each value as item, i (i)}
      <div class="json-array-item">
        <div class="json-array-item-body">
          <JsonNode value={item} depth={depth + 1} on:change={e => setIndex(i, e.detail)} />
        </div>
        <button type="button" class="btn-danger json-remove" on:click={() => removeIndex(i)} aria-label="Remove item">×</button>
      </div>
    {/each}
    <button type="button" class="btn-ghost json-add" on:click={addItem}>+ Add {label || 'item'}</button>
  </div>
{:else if isPlainObject(value)}
  <div class="json-object" style="--depth: {depth}">
    {#if label}<div class="json-label">{label}</div>{/if}
    {#each Object.keys(value) as key (key)}
      <div class="json-field">
        <JsonNode value={value[key]} label={key} depth={depth + 1} on:change={e => setKey(key, e.detail)} />
      </div>
    {/each}
  </div>
{:else if typeof value === 'boolean'}
  <label class="json-bool-label">
    <input type="checkbox" checked={value} on:change={onBoolInput} />
    {label}
  </label>
{:else if typeof value === 'number'}
  <label class="json-scalar-label">
    {#if label}<span class="json-label">{label}</span>{/if}
    <input type="number" value={value} on:input={onNumberInput} />
  </label>
{:else}
  <label class="json-scalar-label">
    {#if label}<span class="json-label">{label}</span>{/if}
    {#if typeof value === 'string' && (value.length > 80 || value.includes('\n'))}
      <textarea rows="3" value={value} on:input={onTextareaInput}></textarea>
    {:else}
      <input type="text" value={value ?? ''} on:input={onStringInput} />
    {/if}
  </label>
{/if}

<style>
  .json-label {
    font-size: 11px;
    color: var(--admin-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
    display: block;
  }
  .json-object {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-left: calc(var(--depth) * 4px);
  }
  .json-field { display: flex; flex-direction: column; }
  .json-array {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .json-array-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    border: 1px solid var(--admin-border);
    border-radius: 6px;
    padding: 10px;
    background: var(--admin-surface);
  }
  .json-array-item-body { flex: 1; min-width: 0; }
  .json-remove {
    padding: 2px 8px;
    font-size: 13px;
    line-height: 1;
    flex-shrink: 0;
  }
  .json-add { align-self: flex-start; font-size: 12px; padding: 4px 10px; }
  .json-bool-label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .json-scalar-label { display: flex; flex-direction: column; gap: 2px; }
  .json-scalar-label input, .json-scalar-label textarea {
    font-size: 13px;
    padding: 6px 8px;
    width: 100%;
  }
</style>
