import { describe, expect, it } from 'vitest';

import { parseQuery } from './query';

describe('parseQuery', () => {
  it('treats an http(s) link as a url query', () => {
    expect(parseQuery('https://www.coupang.com/vp/products/123')).toEqual({
      kind: 'url',
      value: 'https://www.coupang.com/vp/products/123',
    });
  });

  it('adds https to a bare domain link', () => {
    expect(parseQuery('smartstore.naver.com/shop/products/42')).toEqual({
      kind: 'url',
      value: 'https://smartstore.naver.com/shop/products/42',
    });
  });

  it('treats free text as a product name and collapses whitespace', () => {
    expect(parseQuery('  라운드랩   독도 토너 ')).toEqual({
      kind: 'name',
      value: '라운드랩 독도 토너',
    });
  });

  it('keeps a product name containing a dot as a name', () => {
    expect(parseQuery('비타민C 1000mg 2.0')).toEqual({
      kind: 'name',
      value: '비타민C 1000mg 2.0',
    });
  });

  it('rejects non-http schemes', () => {
    expect(() => parseQuery('javascript:alert(1)')).toThrow();
    expect(() => parseQuery('ftp://example.com/file')).toThrow();
  });

  it('rejects links to local or private hosts', () => {
    expect(() => parseQuery('http://localhost:3000/x')).toThrow();
    expect(() => parseQuery('http://192.168.0.1/admin')).toThrow();
    expect(() => parseQuery('http://127.0.0.1/')).toThrow();
  });

  it('rejects input that is too short or too long', () => {
    expect(() => parseQuery('a')).toThrow();
    expect(() => parseQuery('x'.repeat(501))).toThrow();
  });
});
