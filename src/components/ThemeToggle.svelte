<script lang="ts">
  import { onMount } from 'svelte';
  import { preference, initTheme, cyclePreference, type Preference } from '../lib/theme';

  const labels: Record<Preference, string> = {
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  };

  onMount(() => {
    initTheme();
  });
</script>

<button
  class="theme-toggle"
  on:click={cyclePreference}
  aria-label={`Theme: ${labels[$preference]}. Click to change.`}
  title={`Theme: ${labels[$preference]}`}
>
  {#if $preference === 'system'}
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M8 21h8M12 17v4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  {:else if $preference === 'light'}
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path
        d="M12 2.5v2.5M12 19v2.5M21.5 12H19M5 12H2.5M18.36 5.64l-1.77 1.77M7.41 16.59l-1.77 1.77M18.36 18.36l-1.77-1.77M7.41 7.41 5.64 5.64"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
  {:else}
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" fill="currentColor" />
    </svg>
  {/if}
</button>

<style>
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-text);
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.15s ease, border-color 0.15s ease;
  }

  .theme-toggle:hover {
    color: var(--color-accent-text);
    border-color: var(--color-accent);
  }

  .theme-toggle:focus-visible {
    outline: 2px solid rgba(255, 140, 0, 0.6);
    outline-offset: 2px;
  }
</style>
