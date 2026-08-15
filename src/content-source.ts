import type { ContentSource } from "./types.js";

export interface ContentSourceOptions {
  title?: string;
  baseUri?: string;
  contentHash?: string;
  extensions?: Record<string, unknown>;
}

const URI_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

function parseHttpUri(value: string, field: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid HTTP(S) URI`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${field} must use http or https`);
  }
  return parsed.toString();
}

/**
 * Convert a Play's single `source` string into the canonical URI-or-Markdown
 * contract. HTTP(S) inputs remain URI sources; all non-empty, non-URI inputs
 * are Markdown. URI-like values with unsupported schemes fail closed.
 */
export function parseContentSourceInput(
  sourceId: string,
  input: string,
  options: ContentSourceOptions = {}
): ContentSource {
  if (!sourceId.trim()) throw new Error("sourceId must not be empty");
  if (!input.trim()) throw new Error("source must be a non-empty HTTP(S) URI or Markdown string");

  const value = input.trim();
  const common = {
    schema_version: "v1" as const,
    source_id: sourceId,
    ...(options.title ? { title: options.title } : {}),
    ...(options.contentHash ? { content_hash: options.contentHash } : {}),
    ...(options.extensions ? { extensions: options.extensions } : {})
  };

  if (/^https?:\/\//i.test(value)) {
    if (options.baseUri) throw new Error("baseUri is only valid for Markdown sources");
    return { ...common, kind: "uri", uri: parseHttpUri(value, "source") };
  }

  if (URI_SCHEME.test(value)) {
    throw new Error("source URI must use http or https");
  }

  return {
    ...common,
    kind: "markdown",
    markdown: input,
    ...(options.baseUri ? { base_uri: parseHttpUri(options.baseUri, "baseUri") } : {})
  };
}
