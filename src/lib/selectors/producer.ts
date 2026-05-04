// Copyright 2021-2024 Adobe, Copyright 2025 The C2PA Contributors

import type { Manifest } from '@contentauth/c2pa-web';

interface ProducerInfo {
  name: string;
  url?: string;
}

export function selectProducer(manifest: Manifest): ProducerInfo | null {
  // 1. Check CreativeWork schema
  const creativeWork = ((manifest.assertions as unknown as Record<string, unknown>)?.[ 'stds.schema-org.CreativeWork' ] as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined;

  if (creativeWork?.author) {
    const author = Array.isArray(creativeWork.author) ? creativeWork.author[0] : creativeWork.author;

    if (author?.name) {
      return { name: author.name, url: author.url };
    }
  }

  // 2. Check XMP producer/creator
  const xmp = ((manifest.assertions as unknown as Record<string, unknown>)?.[ 'stds.xmp' ] as Record<string, unknown> | undefined)?.data as Record<string, unknown> | undefined;

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
