// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { Manifest } from '@contentauth/c2pa-web';
import { isSecureUrl } from '../url';

declare module '@contentauth/c2pa-web' {
  interface Reference {
    uri: string;
  }
  interface Resource {
    reference: Reference;
  }
  interface ExtendedAssertions {
    'c2pa.asset-ref': {
      references: Resource[];
    };
  }
}

type AssetRefAssertion = { data?: { references?: Array<{ reference?: { uri?: string } }> } };
type CreativeWorkAssertion = { data?: { url?: string } };

export function selectWebsite(manifest: Manifest): string | null {
  const assertions = manifest.assertions as any;
  let assetRefAssertion;
  if (assertions instanceof Map) {
    assetRefAssertion = assertions.get('c2pa.asset-ref')?.[0] || assertions.get('c2pa.asset-ref');
  } else if (Array.isArray(assertions)) {
    assetRefAssertion = assertions.find((a: any) => a.label === 'c2pa.asset-ref');
  } else {
    assetRefAssertion = assertions?.['c2pa.asset-ref'];
  }

  let creativeWorkAssertion;
  if (assertions instanceof Map) {
    creativeWorkAssertion = assertions.get('stds.schema-org.CreativeWork')?.[0] || assertions.get('stds.schema-org.CreativeWork');
  } else if (Array.isArray(assertions)) {
    creativeWorkAssertion = assertions.find((a: any) => a.label === 'stds.schema-org.CreativeWork');
  } else {
    creativeWorkAssertion = assertions?.['stds.schema-org.CreativeWork'];
  }

  const site =
    (assetRefAssertion as AssetRefAssertion)?.data?.references?.[0]?.reference?.uri ??
    (creativeWorkAssertion as CreativeWorkAssertion)?.data?.url;

  return site && isSecureUrl(site) ? site : null;
}
