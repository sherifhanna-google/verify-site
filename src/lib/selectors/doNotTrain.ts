// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { Manifest } from '@contentauth/c2pa-web';

export function selectDoNotTrain(manifest: Manifest): boolean {
  const assertions = manifest.assertions as any;

  // Check for the explicit do not train/mine assertion
  let trainingAssertions;
  if (assertions instanceof Map) {
    trainingAssertions = assertions.get('c2pa.training-mining')?.[0] || assertions.get('c2pa.training-mining');
  } else if (Array.isArray(assertions)) {
    trainingAssertions = assertions.find((a: any) => a.label === 'c2pa.training-mining');
  } else {
    trainingAssertions = assertions?.['c2pa.training-mining'];
  }

  if (trainingAssertions) {
    type TrainingEntry = { use: string; c2pa_manifest: boolean | string };
    type TrainingMining = { data?: { entries?: TrainingEntry[] } };
    const entry = (trainingAssertions as TrainingMining)?.data?.entries?.find((e: TrainingEntry) =>
      e.use === 'notAllowed' && (e.c2pa_manifest === true || e.c2pa_manifest === 'true')
    );

    return !!entry;
  }

  // Fallback: Check c2pa.actions for specific 'not_trained' markers
  type ActionsAssertion = { data?: { actions?: Array<{ action: string }> } };
  let actionsAssertion;
  if (assertions instanceof Map) {
    actionsAssertion = assertions.get('c2pa.actions')?.[0] || assertions.get('c2pa.actions');
  } else if (Array.isArray(assertions)) {
    actionsAssertion = assertions.find((a: any) => a.label === 'c2pa.actions');
  } else {
    actionsAssertion = assertions?.['c2pa.actions'];
  }

  const actions = (actionsAssertion as ActionsAssertion)?.data?.actions ?? [];

  return actions.some((a) => a.action === 'c2pa.not_trained');
}
