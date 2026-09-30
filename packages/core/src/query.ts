export const QUERY_MIN_LENGTH = 2;
export const QUERY_MAX_LENGTH = 500;

export type ProductQuery =
  | { kind: 'url'; value: string }
  | { kind: 'name'; value: string };

export class InvalidQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidQueryError';
  }
}

const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
// "domain.tld/..." without a scheme, e.g. "smartstore.naver.com/shop/1"
const BARE_DOMAIN_PATTERN = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i;
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
];

function toUrlQuery(raw: string): ProductQuery {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new InvalidQueryError('올바른 링크 형식이 아니에요.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidQueryError('http 또는 https 링크만 분석할 수 있어요.');
  }
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new InvalidQueryError('공개된 쇼핑몰 링크만 분석할 수 있어요.');
  }
  return { kind: 'url', value: url.toString() };
}

/** Classifies raw user input as a product link or a product name. */
export function parseQuery(input: string): ProductQuery {
  const normalized = input.trim().replace(/\s+/g, ' ');

  if (normalized.length < QUERY_MIN_LENGTH) {
    throw new InvalidQueryError(`${QUERY_MIN_LENGTH}자 이상 입력해 주세요.`);
  }
  if (normalized.length > QUERY_MAX_LENGTH) {
    throw new InvalidQueryError(`${QUERY_MAX_LENGTH}자 이하로 입력해 주세요.`);
  }

  if (SCHEME_PATTERN.test(normalized)) {
    return toUrlQuery(normalized);
  }
  if (!normalized.includes(' ') && BARE_DOMAIN_PATTERN.test(normalized)) {
    return toUrlQuery(`https://${normalized}`);
  }
  return { kind: 'name', value: normalized };
}
