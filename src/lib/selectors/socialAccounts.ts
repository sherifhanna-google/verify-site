// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { Manifest } from '@contentauth/c2pa-web';

export interface SocialAccount {
  '@id': string;
  '@type': string;
  name: string;
  identifier: string;
}

export function selectSocialAccounts(manifest: Manifest): SocialAccount[] {
  const accounts: SocialAccount[] = [];

  interface VcCredentialShape {
    credentialSubject?: {
      id?: string;
      account?: {
        service?: string;
        identifier?: string;
      };
    };
  }
  const credentials = (manifest.credentials || []) as unknown as VcCredentialShape[];
  
  for (const cred of credentials) {
    const vcData = cred.credentialSubject || {};

    if (vcData?.account?.service && vcData?.account?.identifier) {
      accounts.push({
        '@id': vcData.id || '',
        '@type': 'Organization',
        name: vcData.account.identifier,
        identifier: vcData.account.service,
      });
    }
  }


  
  const assertionsArray = (manifest.assertions || []) as unknown[];
  type AssertionItem = { label?: string; data?: unknown };
  const creativeWorkAssertion = assertionsArray.find((a: unknown) => (a as AssertionItem).label === 'stds.schema-org.CreativeWork') as AssertionItem | undefined;
  const authorData = (creativeWorkAssertion?.data as Record<string, unknown> | undefined)?.author;

  if (authorData?.sameAs) {
    const urls = Array.isArray(authorData.sameAs) 
      ? authorData.sameAs 
      : [authorData.sameAs];
      
    for (const url of urls) {
      if (url.includes('twitter.com') || url.includes('x.com')) {
        accounts.push({ '@id': url, '@type': 'Organization', name: url.split('/').pop() || url, identifier: 'twitter' });
      } else if (url.includes('instagram.com')) {
        accounts.push({ '@id': url, '@type': 'Organization', name: url.split('/').pop() || url, identifier: 'instagram' });
      } else if (url.includes('linkedin.com')) {
        accounts.push({ '@id': url, '@type': 'Organization', name: url.split('/').pop() || url, identifier: 'linkedin' });
      }
    }
  }

  return accounts;
}
