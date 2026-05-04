// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { ValidationStatus as SdkValidationStatus, StatusCodes } from '@contentauth/c2pa-web';


export type ValidationStatus = SdkValidationStatus;
export type ValidationResults = StatusCodes;
export type ValidationStatusCode = 'valid' | 'invalid' | 'unrecognized';

export type ValidationStatusResult = ReturnType<typeof selectValidationResult>;

export const GENERAL_ERROR_CODE = 'general.error';

export const OTGP_ERROR_CODE = 'assertion.dataHash.mismatch';

export const UNTRUSTED_SIGNER_ERROR_CODE = 'signingCredential.untrusted';

export const SUCCESS_CODES = [
  'claimSignature.validated',
  'signingCredential.trusted',
  'signingCredential.notRevoked',
  'timeStamp.trusted',
  'assertion.hashedURI.match',
  'assertion.dataHash.match',
  'assertion.bmffHash.match',
  'assertion.boxesHash.match',
  'assertion.accessible',
];

/**
 * Determines if a validation status list contains an OTGP (`assertion.dataHash.mismatch`)
 * status, and therefore, should present with an orange badge.
 *
 * @param validationStatus
 * @returns `true` if we find an OTGP status
 */
export function hasOtgpStatus(validationStatus: ValidationStatus[] = []) {
  return validationStatus.some((err) => err.code === OTGP_ERROR_CODE);
}

/**
 * Determines if a validation status list contains an error (anything not in the Rust SDK's
 * `C2PA_STATUS_VALID_SET` list _and_ not an OTGP status) and therefore, should present with a red badge.
 *
 * @param validationStatus
 * @returns `true` if we find an error
 */
export function hasErrorStatus(validationStatus: ValidationStatus[] = []) {
  for (let i = 0; i < validationStatus.length; i++) {
    const code = validationStatus[i].code;

    if (code !== OTGP_ERROR_CODE && code !== UNTRUSTED_SIGNER_ERROR_CODE) {
      return true;
    }
  }

  return false;
}

enum UntrustedSignerResult {
  UntrustedOnly,
  UntrustedWithOtgp,
  UntrustedWithOtherErrors,
  TrustedWithOtgp,
  TrustedWithErrors,
  TrustedOnly,
}

/**
 * Determines if a validation status contains an error indicating that it has failed the trust list check.
 *
 * @param validationStatus
 * @returns `true` if it fails the trust list check
 */
export function hasUntrustedSigner(
  validationStatus: ValidationStatus[] = [],
): UntrustedSignerResult {
  let hasUntrusted = false;
  let hasGeneral = false;
  let othersCount = 0;
  let firstOtherCode: string | null = null;

  for (let i = 0; i < validationStatus.length; i++) {
    const code = validationStatus[i].code;

    if (code === UNTRUSTED_SIGNER_ERROR_CODE) {
      hasUntrusted = true;
    } else if (code === GENERAL_ERROR_CODE) {
      hasGeneral = true;
    } else {
      othersCount++;

      if (!firstOtherCode) {
        firstOtherCode = code;
      }
    }
  }

  if (othersCount > 0) {
    if (othersCount === 1 && firstOtherCode === OTGP_ERROR_CODE) {
      return hasUntrusted
        ? UntrustedSignerResult.UntrustedWithOtgp
        : UntrustedSignerResult.TrustedWithOtgp;
    }

    return hasUntrusted
      ? UntrustedSignerResult.UntrustedWithOtherErrors
      : UntrustedSignerResult.TrustedWithErrors;
  }

  if (hasUntrusted && hasGeneral) {
    return UntrustedSignerResult.UntrustedOnly;
  }

  if (!hasUntrusted && hasGeneral) {
    return UntrustedSignerResult.TrustedWithErrors;
  }

  return hasUntrusted
    ? UntrustedSignerResult.UntrustedOnly
    : UntrustedSignerResult.TrustedOnly;
}

export function selectValidationResult(
  validationStatus: ValidationStatus[],
  validationResults?: ValidationResults,
) {
  // Combine V2 failures (from validationStatus) and V3 failures (from validationResults)
  const v3Failures = validationResults?.failure || [];
  const v2Failures = validationStatus.filter(
    (status) => !SUCCESS_CODES.includes(status.code)
  );

  const allFailures = [...v3Failures, ...v2Failures];

  // Determine the specific types of failures present
  const hasUntrusted = allFailures.some(f => f.code === UNTRUSTED_SIGNER_ERROR_CODE);
  const hasOtgp = allFailures.some(f => f.code === OTGP_ERROR_CODE);
  const hasOtherErrors = allFailures.some(
    f => f.code !== UNTRUSTED_SIGNER_ERROR_CODE && f.code !== OTGP_ERROR_CODE
  );

  // Check ALL categories for an untrusted timestamp. 
  // (The new SDK might place this in failure, informational, or success depending on strictness).
  const allV3Codes = [
    ...(validationResults?.failure || []),
    ...(validationResults?.informational || []),
    ...(validationResults?.success || []),
  ];
  const allCodes = [...allV3Codes, ...validationStatus];

  const hasUntrustedTimestamp = allCodes.some(
    c => c.code.toLowerCase().includes('timestamp') 
      && !c.code.toLowerCase().includes('timestamp.trusted')
      && !c.code.toLowerCase().includes('timestamp.validated')
  );

  let statusCode: ValidationStatusCode = 'valid';

  // If there are explicit errors (other than just being untrusted), it's invalid (Red)
  if (hasOtherErrors || hasOtgp) {
    statusCode = 'invalid';
  } 
  // If the only issue is an untrusted signer, it's unrecognized (Orange)
  else if (hasUntrusted) {
    statusCode = 'unrecognized';
  }
  // If the failure array is empty, it's valid (Green)

  return {
    hasError: hasOtherErrors || hasOtgp,
    hasOtgp,
    hasUntrustedSigner: hasUntrusted,
    hasUntrustedTimestamp,
    statusCode,
  };
}

const jumbfUriRegExp = /^self#jumbf=\/c2pa\/([^/]+)\/?(.*)$/i;

export function extractManifestLabelFromJumbfUri(uri: string) {
  return jumbfUriRegExp.exec(uri)?.[1] ?? null;
}

export type ManifestLabelValidationStatusMap = Record<
  string,
  ValidationStatus[]
>;

interface ValidationStatusReducer {
  reduced: ManifestLabelValidationStatusMap;
  currentKey: string | null;
}

/**
 * This function parses the runtime validation status list, which exists in the root of the `manifestStore` object.
 *
 * The way the validation status list is sorted from c2pa-rs is that any entry without a `url` that is a manifest
 * label is attributed to its "parent" error that has one. The "parent" error will come _after_ the originating error
 * due to the traversal path when c2pa-rs validates a manifest.
 *
 * Sometimes, URLs may reference labels that don't exist in the case of corrupted manifests. In this case, we try to
 * attribute everything to the active manifest label. Some safeguards are also in place to make sure entries that
 * don't have a label for whatever reason get attributed to the active manifest.
 *
 * **IMPORTANT:** Please update the tests in `validationResult.spec.ts` if making any changes to this function.
 *
 * @param validation_status The runtime validation status on the root of the manifest
 * @param allLabels
 * @param activeManifestLabel
 * @returns
 */
export function validationStatusByManifestLabel(
  validation_status: ValidationStatus[],
  allLabels: string[],
  activeManifestLabel: string,
): ManifestLabelValidationStatusMap {
  const { reduced } = [...validation_status]
    // Reverse this so we don't have to look forward for the associated URLs
    .reverse()
    .reduce<ValidationStatusReducer>(
      (acc, curr) => {
        // Try to see if this entry has a label in the URL to associate the validation status with
        const label = extractManifestLabelFromJumbfUri(curr.url ?? '');

        if (label) {
          // If this label exists in the manifest store, use it. If not, attribute to the active manifest.
          const currentKey = allLabels.includes(label)
            ? label
            : activeManifestLabel;

          return {
            reduced: {
              ...acc.reduced,
              [currentKey]: [...(acc.reduced[currentKey] ?? []), curr],
            },
            currentKey,
          };
        } else if (acc.currentKey) {
          // If we previously parsed a status with a valid label, use that
          acc.reduced[acc.currentKey].push(curr);
        } else {
          // If we don't have anything to go off of and no previous label, add to active manifest errors
          acc.reduced[activeManifestLabel] = [
            ...(acc.reduced[activeManifestLabel] ?? []),
            curr,
          ];
        }

        return acc;
      },
      { reduced: {}, currentKey: null },
    );

  return reduced;
}
