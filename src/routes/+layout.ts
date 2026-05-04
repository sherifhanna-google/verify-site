// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { LayoutLoad } from './$types';

export const ssr = false;

export const load: LayoutLoad = async () => {
  if (typeof window !== 'undefined') {
    await import('$lib/i18n');
    const { initI18n } = await import('$lib/i18n');
    const { locale, waitLocale } = await import('svelte-i18n');

    initI18n();
    locale.set(window.navigator.language);
    await waitLocale();
  }
};
