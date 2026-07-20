import { writable } from 'svelte/store';

export type Preference = 'system' | 'light' | 'dark';

const order: Preference[] = ['system', 'light', 'dark'];

function readPreference(): Preference {
  const stored = localStorage.getItem('theme');
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export const preference = writable<Preference>('system');

let media: MediaQueryList | undefined;

function applyTheme(pref: Preference) {
  const theme = pref === 'system' ? (media?.matches ? 'dark' : 'light') : pref;
  document.documentElement.setAttribute('data-theme', theme);
}

export function initTheme() {
  if (!media) {
    media = window.matchMedia('(prefers-color-scheme: dark)');
  }
  preference.set(readPreference());
}

export function cyclePreference() {
  preference.update((current) => {
    const next = order[(order.indexOf(current) + 1) % order.length];
    if (next === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', next);
    }
    applyTheme(next);
    return next;
  });
}
