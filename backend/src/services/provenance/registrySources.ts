/**
 * Building a fact registry from whatever the founder actually gave us.
 *
 * Shared by the evaluation route and the investor Q&A service so the two can
 * never drift into disagreeing about which numbers count as founder-supplied —
 * the same discipline the rest of this module applies to provenance itself.
 *
 * Only text can be indexed. A PDF deck is handed to Gemini as bytes and is
 * never turned into text on this side, so any figure living only in a PDF is
 * invisible here and will be reported as untraceable. That limitation is the
 * reason the guard ships in `report` mode; it is not a reason to weaken the
 * check.
 */

import fs from 'fs';

import { FactRegistry } from './factRegistry.ts';

export interface RegistrySources {
  /** Profile JSON, Q&A answers — anything the founder wrote, as text. */
  readonly texts?: readonly (string | null | undefined)[];
  /** Extracted documents. Non-text ones are skipped, not failed on. */
  readonly documents?: readonly { readonly mimeType: string; readonly localPath: string }[];
}

export async function registryFrom(sources: RegistrySources): Promise<FactRegistry> {
  const registry = new FactRegistry().ingestAll(sources.texts ?? []);

  for (const doc of sources.documents ?? []) {
    if (!doc.mimeType.startsWith('text/')) continue;
    try {
      registry.ingest(await fs.promises.readFile(doc.localPath, 'utf-8'));
    } catch (readErr: any) {
      // A document we cannot read makes the registry smaller, which makes the
      // guard noisier — never wrong. Warn and carry on rather than failing a
      // founder's evaluation over a missing temp file.
      console.warn('[provenance] Could not index', doc.localPath, readErr?.message);
    }
  }

  return registry;
}
