<script lang="ts">
  import { onMount } from 'svelte';
  import { readingFont, initReadingFont, toggleReadingFont } from '../lib/readingFont';

  onMount(() => {
    initReadingFont();
  });
</script>

<button
  class="font-toggle"
  class:active={$readingFont === 'dyslexic'}
  on:click={toggleReadingFont}
  aria-pressed={$readingFont === 'dyslexic'}
>
  <span class="switch" aria-hidden="true">
    <span class="switch-knob"></span>
  </span>
  <span class="font-toggle-label">Dyslexia-friendly font</span>
</button>

<style>
  .font-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-text);
    cursor: pointer;
    padding: 0.35rem 0.75rem 0.35rem 0.4rem;
    font-family: Comfortaa, sans-serif;
    font-size: 0.8rem;
    transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  }

  .font-toggle:hover {
    color: var(--color-accent-text);
    border-color: var(--color-accent);
  }

  .font-toggle.active {
    color: var(--color-accent-text);
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  }

  .font-toggle:focus-visible {
    outline: 2px solid rgba(255, 140, 0, 0.6);
    outline-offset: 2px;
  }

  .switch {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    width: 1.75rem;
    height: 1rem;
    border-radius: 999px;
    background: var(--color-border);
    padding: 0.15rem;
    transition: background 0.15s ease;
  }

  .font-toggle.active .switch {
    background: var(--color-accent);
  }

  .switch-knob {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--color-bg-raised);
    transition: transform 0.15s ease;
  }

  .font-toggle.active .switch-knob {
    transform: translateX(0.75rem);
  }

  .font-toggle-label {
    white-space: nowrap;
  }
</style>
