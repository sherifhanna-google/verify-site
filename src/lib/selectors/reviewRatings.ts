// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { Ingredient, Manifest } from '@contentauth/c2pa-web';

type ReviewRating = NonNullable<
  NonNullable<Ingredient['metadata']>['reviewRatings']
>[0];

export function selectReviewRatings(manifest: Manifest) {
  const ingredientRatings = (manifest.ingredients ?? []).reduce<ReviewRating[]>(
    (acc, ingredient: Ingredient) => {
      return [...acc, ...(ingredient.metadata?.reviewRatings ?? [])];
    },
    [],
  );
  interface C2paActionsAssertion {
    data?: {
      metadata?: {
        reviewRatings?: ReviewRating[];
      };
    };
  }
  const actionsAssertion = (manifest.assertions as unknown as Record<string, unknown>)?.[ 'c2pa.actions' ] as C2paActionsAssertion | undefined;
  const actionRatings = actionsAssertion?.data?.metadata?.reviewRatings ?? [];
  const reviewRatings = [...ingredientRatings, ...actionRatings];

  return {
    hasUnknownActions: reviewRatings.some((review) =>
      ['actions.unknownActionsPerformed', 'actions.possiblyMissing'].includes(
        review.code ?? '',
      ),
    ),
    wasPossiblyModified: reviewRatings.some(
      (review) => review.code === 'ingredient.possiblyModified',
    ),
  };
}
