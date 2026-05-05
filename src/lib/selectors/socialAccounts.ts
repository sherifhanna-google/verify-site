// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { Manifest } from '@contentauth/c2pa-web';

export interface SocialAccount {
  '@id': string;
  '@type': string;
  name: string;
  identifier: string;
  isDocumentVerified?: boolean;
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

  interface CawgIdentityShape {
    verifiedIdentities?: Array<{
      type: string;
      username?: string;
      name?: string;
      uri?: string;
      provider?: {
        id?: string;
        name?: string;
      };
    }>;
  }

  const cawgIdentityAssertion = assertionsArray.find((a: unknown) => (a as AssertionItem).label === 'cawg.identity') as AssertionItem | undefined;

  if (cawgIdentityAssertion) {
    const identityData = cawgIdentityAssertion.data as CawgIdentityShape | undefined;
    const verifiedList = identityData?.verifiedIdentities || [];


    for (let i = 0; i < verifiedList.length; i++) {
      const identity = verifiedList[i];

      if ((identity.type === 'cawg.social_media' || identity.type === 'cawg.document_verification') && identity.uri && (identity.username || identity.name)) {
        const linkUrl = identity.uri;
        const isDoc = identity.type === 'cawg.document_verification';
        const accountName = identity.username || identity.name || '';
        const appName = identity.provider?.name?.toLowerCase() || 'social';

        let existingAccount: SocialAccount | undefined = undefined;
        
        for (let j = 0; j < accounts.length; j++) {
          if (accounts[j].identifier === appName || accounts[j]['@id'] === linkUrl) {
            existingAccount = accounts[j];
            break;
          }
        }

        if (existingAccount) {
          if (isDoc) {
            existingAccount.name = accountName;
            existingAccount.isDocumentVerified = true;
          }
        } else {
          accounts.push({
            '@id': linkUrl,
            '@type': 'Organization',
            name: accountName,
            identifier: appName,
            isDocumentVerified: isDoc,
          });
        }
      }
    }
  }

  const authorData = (creativeWorkAssertion?.data as Record<string, unknown> | undefined)?.author as { sameAs?: string | string[] } | undefined;

  if (authorData?.sameAs) {
    const urls = Array.isArray(authorData.sameAs) 
      ? authorData.sameAs 
      : [authorData.sameAs];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

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
