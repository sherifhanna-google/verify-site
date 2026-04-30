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
  let actionAssertion;
  const assertions = manifest.assertions as any;
  if (assertions instanceof Map) {
    actionAssertion = assertions.get('c2pa.actions.v2')?.[0] || assertions.get('c2pa.actions.v2');
  } else if (Array.isArray(assertions)) {
    actionAssertion = assertions.find((a: any) => a.label === 'c2pa.actions.v2');
  } else {
    actionAssertion = assertions?.['c2pa.actions.v2'];
  }

  if (!actionAssertion) {
    return null;
  }

  const dubbedAction = (actionAssertion as any).data?.actions?.find(
    ({ action }: any) => action === 'c2pa.dubbed',
  );
  const translatedAction = (actionAssertion as any).data?.actions?.find(
    ({ action }: any) => action === 'c2pa.translated',
  );
  const editedAction = (actionAssertion as any).data?.actions?.find(
    ({ action }: any) => action === 'c2pa.edited',
  );

  if (dubbedAction) {
    const dubbedRegionOfInterest = dubbedAction.changes?.find(
      (change: any) => !!change?.region,
    )?.region;
    const dubbedIdentified = dubbedRegionOfInterest?.find(
      (region: Record<string, unknown>) => region.type === 'identified',
    )?.item.value;
    const hasLipsRoi = dubbedIdentified === 'lips';

    const editedRegionOfInterest = editedAction?.changes?.find(
      (change: any) => !!change?.region,
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
