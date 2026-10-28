import { ErrorCode } from '@gap-product-guru/shared';
import { ApiError } from '@google/genai';
import { describe, expect, it } from 'vitest';

import { buildGenerationConfig, toAiError } from '@/lib/gemini.js';

/** The shape the SDK produces: the JSON error body stringified into `message`. */
const geminiError = (status: number, details: unknown[] = [], message = 'quota exceeded') =>
  new ApiError({
    status,
    message: JSON.stringify({ error: { code: status, message, status: 'X', details } }),
  });

const retryInfo = (delay: string) => ({
  '@type': 'type.googleapis.com/google.rpc.RetryInfo',
  retryDelay: delay,
});

const quotaFailure = (quotaId: string) => ({
  '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
  violations: [{ quotaId }],
});

describe('toAiError', () => {
  it('maps a per-minute 429 to AI_RATE_LIMITED with the rounded-up retryDelay', () => {
    const error = toAiError(
      geminiError(429, [quotaFailure('GenerateRequestsPerMinutePerProject'), retryInfo('36.4s')]),
    );
    expect(error?.code).toBe(ErrorCode.AI_RATE_LIMITED);
    expect(error?.retryAfterSeconds).toBe(37);
  });

  it('detects the daily quota even though it also carries a retryDelay', () => {
    const error = toAiError(
      geminiError(429, [
        quotaFailure('GenerateRequestsPerDayPerProjectPerModel-FreeTier'),
        retryInfo('12s'),
      ]),
    );
    expect(error?.code).toBe(ErrorCode.AI_QUOTA_EXHAUSTED);
  });

  it('defaults to 60 seconds when Gemini sends no retry hint', () => {
    expect(toAiError(geminiError(429))?.retryAfterSeconds).toBe(60);
  });

  it('handles errors raised mid-stream ("got status: …" prefix)', () => {
    const body = JSON.stringify({ error: { code: 429, details: [retryInfo('5s')] } });
    const error = toAiError(
      new ApiError({ status: 429, message: `got status: RESOURCE_EXHAUSTED. ${body}` }),
    );
    expect(error?.retryAfterSeconds).toBe(5);
  });

  it('maps 5xx to AI_UNAVAILABLE and an invalid key to AI_UNAVAILABLE', () => {
    expect(toAiError(geminiError(503))?.code).toBe(ErrorCode.AI_UNAVAILABLE);
    expect(
      toAiError(geminiError(400, [], 'API key not valid. Please pass a valid API key.'))?.code,
    ).toBe(ErrorCode.AI_UNAVAILABLE);
  });

  it('maps a request timeout (AbortError) to AI_UNAVAILABLE', () => {
    const timeout = new DOMException('This operation was aborted', 'AbortError');
    expect(toAiError(timeout)?.code).toBe(ErrorCode.AI_UNAVAILABLE);
  });

  it('returns null for errors it does not recognise', () => {
    expect(toAiError(new Error('boom'))).toBeNull();
    expect(toAiError(geminiError(400, [], 'Invalid argument'))).toBeNull();
  });
});

describe('buildGenerationConfig', () => {
  it('disables thinking with a budget on Gemini 2.5', () => {
    expect(buildGenerationConfig('gemini-2.5-flash').thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it('uses a thinking level and default temperature on newer models', () => {
    const config = buildGenerationConfig('gemini-3.8-flash');
    expect(config.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
    expect(config.temperature).toBeUndefined();
  });
});
