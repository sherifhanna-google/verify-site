// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { Manifest } from '@contentauth/c2pa-web';

export function selectDoNotTrain(manifest: Manifest): boolean {
  // Check for the explicit do not train/mine assertion
  const trainingAssertions = (manifest.assertions as unknown as Record<string, unknown>)?.[ 'c2pa.training-mining' ];

  if (trainingAssertions) {
    type TrainingEntry = { use: string; c2pa_manifest: boolean | string };
    const entries = (trainingAssertions as { data?: { entries?: TrainingEntry[] } })?.data?.entries || [];
    
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];

      if (e.use === 'notAllowed' && (e.c2pa_manifest === true || e.c2pa_manifest === 'true')) {
        return true;
      }
    }
  }

  // Fallback: Check c2pa.actions for specific 'not_trained' markers
  const actionsAssertion = (manifest.assertions as unknown as Record<string, unknown>)?.[ 'c2pa.actions' ];
  type ActionItem = { action: string };
  const actions = (actionsAssertion as { data?: { actions?: ActionItem[] } })?.data?.actions || [];

  for (let i = 0; i < actions.length; i++) {
    if (actions[i].action === 'c2pa.not_trained') {
      return true;
    }
  }

  return false;
}
