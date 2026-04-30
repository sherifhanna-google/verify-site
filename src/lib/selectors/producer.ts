// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { Manifest } from '@contentauth/c2pa-web';

interface ProducerInfo {
  name: string;
  url?: string;
}

type CreativeWorkAssertion = { data?: { author?: { name?: string; url?: string; sameAs?: string | string[] } | Array<{ name?: string; url?: string }> } };
type XmpAssertion = { data?: { 'dc:creator'?: string | string[] } };

export function selectProducer(manifest: Manifest): ProducerInfo | null {
  const assertions = manifest.assertions as any;

  // 1. Check CreativeWork schema
  let creativeWorkAssertion;
  if (assertions instanceof Map) {
    creativeWorkAssertion = assertions.get('stds.schema-org.CreativeWork')?.[0] || assertions.get('stds.schema-org.CreativeWork');
  } else if (Array.isArray(assertions)) {
    creativeWorkAssertion = assertions.find((a: any) => a.label === 'stds.schema-org.CreativeWork');
  } else {
    creativeWorkAssertion = assertions?.['stds.schema-org.CreativeWork'];
  }
  const creativeWork = (creativeWorkAssertion as CreativeWorkAssertion)?.data;

  if (creativeWork?.author) {
    const author = Array.isArray(creativeWork.author) ? creativeWork.author[0] : creativeWork.author;

    if (author?.name) {
      return { name: author.name, url: author.url };
    }
  }

  // 2. Check XMP producer/creator
  let xmpAssertion;
  if (assertions instanceof Map) {
    xmpAssertion = assertions.get('stds.xmp')?.[0] || assertions.get('stds.xmp');
  } else if (Array.isArray(assertions)) {
    xmpAssertion = assertions.find((a: any) => a.label === 'stds.xmp');
  } else {
    xmpAssertion = assertions?.['stds.xmp'];
  }
  const xmp = (xmpAssertion as XmpAssertion)?.data;

  if (xmp?.['dc:creator']) {
    const creator = Array.isArray(xmp['dc:creator']) ? xmp['dc:creator'][0] : xmp['dc:creator'];

    return { name: creator };
  }

  // 3. Fallback to certificate subject common name
  const commonName = manifest.signature_info?.common_name;

  if (commonName) {
    return { name: commonName };
  }

  return null;
}
