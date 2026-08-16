const API_PATH_PREFIX = "/api/v1/";

export function toSameOriginApiUrl(
  value: string
): string {
  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.pathname.startsWith(API_PATH_PREFIX)) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Preserve non-URL values so the caller can surface the original error.
  }

  return value;
}

export function toOptionalSameOriginApiUrl(
  value: string | null | undefined
): string | null {
  return value ? toSameOriginApiUrl(value) : null;
}
