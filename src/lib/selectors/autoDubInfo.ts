// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { Manifest } from '@contentauth/c2pa-web';

export interface TranslatedActionDataParams {
  sourceLanguage: string;
  targetLanguage: string;
}

export interface AutoDubInfo {
  hasLipsRoi: boolean;
  hasTranscriptRoi: boolean;
  translatedData: TranslatedActionDataParams | null;
}

export function selectAutoDubInfo(manifest: Manifest): AutoDubInfo | null {
  const actionAssertion = (manifest.assertions as unknown as Record<string, unknown>)?.[ 'c2pa.actions.v2' ];

  if (!actionAssertion) {
    return null;
  }

  type AutoDubChange = { region?: Array<{ type: string; item: { value: string } }> };
  type AutoDubAction = { action: string; changes?: AutoDubChange[]; parameters?: unknown };
  type AutoDubData = { data?: { actions?: AutoDubAction[] } };

  const actions = (actionAssertion as AutoDubData)?.data?.actions || [];

  let dubbedAction: AutoDubAction | undefined;
  let translatedAction: AutoDubAction | undefined;
  let editedAction: AutoDubAction | undefined;

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];

    if (a.action === 'c2pa.dubbed') {
      dubbedAction = a;
    } else if (a.action === 'c2pa.translated') {
      translatedAction = a;
    } else if (a.action === 'c2pa.edited') {
      editedAction = a;
    }
  }

  if (dubbedAction) {
    const dubbedRegionOfInterest = dubbedAction.changes?.find(
      (change: AutoDubChange) => !!change?.region,
    )?.region;
    const dubbedIdentified = dubbedRegionOfInterest?.find(
      (region: Record<string, unknown>) => region.type === 'identified',
    )?.item.value;
    const hasLipsRoi = dubbedIdentified === 'lips';

    const editedRegionOfInterest = editedAction?.changes?.find(
      (change: AutoDubChange) => !!change?.region,
    )?.region;
    const editedIdentified = editedRegionOfInterest?.find(
      (region: Record<string, unknown>) => region.type === 'identified',
    )?.item.value;
    const hasTranscriptRoi = editedIdentified === 'transcript';

    const translatedLanguageData = translatedAction?.parameters ?? null;

    return {
      hasLipsRoi,
      hasTranscriptRoi,
      translatedData: translatedLanguageData as TranslatedActionDataParams,
    };
  }

  return null;
}
