import { writable } from 'svelte/store';

export type ReadingFont = 'default' | 'dyslexic';

function readPreference(): ReadingFont {
  return localStorage.getItem('reading-font') === 'dyslexic' ? 'dyslexic' : 'default';
}

export const readingFont = writable<ReadingFont>('default');

let dyslexicFontLoaded = false;

// OpenDyslexic is only fetched for visitors who actually turn it on, not shipped
// to every page load.
function loadDyslexicFont() {
  if (dyslexicFontLoaded) return;
  dyslexicFontLoaded = true;
  import('@fontsource/opendyslexic/400.css');
  import('@fontsource/opendyslexic/700.css');
}

function applyReadingFont(pref: ReadingFont) {
  if (pref === 'dyslexic') loadDyslexicFont();
  document.documentElement.setAttribute('data-font', pref);
}

export function initReadingFont() {
  const pref = readPreference();
  readingFont.set(pref);
  applyReadingFont(pref);
}

export function toggleReadingFont() {
  readingFont.update((current) => {
    const next: ReadingFont = current === 'default' ? 'dyslexic' : 'default';
    if (next === 'default') {
      localStorage.removeItem('reading-font');
    } else {
      localStorage.setItem('reading-font', next);
    }
    applyReadingFont(next);
    return next;
  });
}
