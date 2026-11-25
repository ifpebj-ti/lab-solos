import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import {
  test as base,
  type BrowserContext,
  type APIRequestContext,
  type APIResponse,
  type Download,
  type Page,
  type Request,
  type Response as BrowserResponse,
} from '@playwright/test';
import { securityE2eData } from './security-e2e-data';
import {
  CDP_RESPONSE_BUFFER_OPTIONS,
  classifyCdpWire304,
  classifyCdpExtraInfo304,
  canSkipBodylessCacheResponse,
  normalizeHarStartedDateTimesByRequestTiming,
  classifyUnavailableBody,
  classifyCdpCacheSource,
  countPendingCdpExtraInfo,
  createCdpActivitySignal,
  createCdpExtraInfoTracker,
  correlateCdpCacheSources,
  correlateCdpCacheSourcesByTime,
  decodeBoundedResponseBody,
  drainCdpCaptureEvents,
  extractSettledCaptureResults,
  isCaptureWithinLimits,
  isUnavailableBodyFatal,
  readPageResourceBody,
  readDownloadBytes,
  type BodyUnavailableReason,
  type CdpCacheResponseObservation,
  type CdpCacheSource,
  type CdpExtraInfoHop,
  type BodylessCacheCandidateSidecarInput,
  type BodylessCacheCandidateSidecarEntry,
  type TimedCdpCacheObservation,
  recordCdpExtraInfo,
  recordCdpResponseStatus,
  setCdpExtraInfoExpectation,
  startCdpExtraInfoHop,
  summarizeBodylessCacheCandidateExtraInfo,
  summarizeBodylessCacheCandidateDiagnostics,
  projectBodylessCacheCandidateSidecar,
  summarizeCdpResourceTypes,
  summarizeCdpExtraInfo,
} from './security-passive-capture-policy';

type HarHeader = { name: string; value: string };
type HarEntry = {
  startedDateTime: string;
  time: number;
  request: Record<string, unknown> & { method: string; url: string };
  response: Record<string, unknown> & {
    status: number;
    headers: HarHeader[];
    content: {
      size: number;
      mimeType: string;
      text: string;
      encoding?: string;
    };
  };
  cache: Record<string, never>;
  timings: { send: number; wait: number; receive: number };
};
type HarCaptureResult = {
  entry: HarEntry;
  cacheCorrelationKey?: string;
  timingCorrelationKey?: string;
  browserRequestStartTimeMs?: number;
  browserRequestRedirected?: boolean;
  cacheSource?: CdpCacheSource;
  bodyUnavailable: boolean;
  bodyFailure: boolean;
  bodyUnavailableReason?: BodyUnavailableReason;
  bodyFailureMethodStatus?: string;
  downloadEventMatched?: boolean;
  downloadBodyRecovered?: boolean;
  fetchBodyRecovered?: boolean;
  cdpBodyRecovered?: boolean;
  cdpBodyErrorClass?: 'protocol_unavailable' | 'size_limit';
};

type BodyUnavailableCounts = Record<BodyUnavailableReason, number>;
type CdpRequestTimingObservation = Omit<TimedCdpCacheObservation, 'source'> & {
  source?: CdpCacheSource;
  extraInfoHop?: CdpExtraInfoHop;
  cacheEventObserved: boolean;
  responseHasExtraInfo?: boolean;
  resourceType?: string;
  loadingFinished: boolean;
};
type BodylessCacheCandidateMetadata = {
  originalEntryIndex: number;
  method: string;
  url: string;
  responseStatus: number;
  wallTimeMs: number | undefined;
  cacheSource: CdpCacheSource;
  diagnosticInput: {
    cacheEventObserved: boolean;
    hasExtraInfo: boolean | undefined;
    responseExtraInfoStatus: number | undefined;
    resourceType: string;
    loadingFinished: boolean;
  };
};
type BrowserRequestEvidence = {
  har_entry_index: number;
  cache_source: CdpCacheSource;
  cache_event_observed: boolean;
  has_extra_info: boolean | null;
  response_extra_info: 'status304' | 'otherStatus' | 'absent';
  resource_type: string;
  loading_finished: boolean;
};

function emptyBodyUnavailableCounts(): BodyUnavailableCounts {
  return {
    no_body_status: 0,
    zero_length: 0,
    attachment: 0,
    binary_media: 0,
    textual_unknown: 0,
  };
}

function emptyCdpCacheSourceCounts(): Record<CdpCacheSource, number> {
  return {
    network: 0,
    disk_cache: 0,
    prefetch_cache: 0,
    early_hints_cache: 0,
    service_worker: 0,
    cache_unspecified: 0,
    metadata_missing: 0,
    ambiguous: 0,
  };
}

function safeMethodStatus(method: string, status: number): string {
  const normalizedMethod = method.toUpperCase();
  const safeMethod = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'].includes(
    normalizedMethod
  )
    ? normalizedMethod
    : 'OTHER';
  return `${safeMethod}:${status}`;
}

const allowedOrigin = new URL(securityE2eData.baseURL).origin;
const captureRoot =
  process.env.SECURITY_ZAP_CAPTURE_DIR ??
  join(tmpdir(), 'lab-solos-zap-capture');
const wrappedRequestMethods = new Set([
  'delete',
  'fetch',
  'get',
  'head',
  'patch',
  'post',
  'put',
]);
const downloadBodies = new Map<string, Promise<Buffer | undefined>>();
const downloadBodyWaiters = new Map<
  string,
  (body: Promise<Buffer | undefined>) => void
>();
const maxCapturedDownloadBytes =
  CDP_RESPONSE_BUFFER_OPTIONS.maxResourceBufferSize;
const maxCapturedCdpBytes = CDP_RESPONSE_BUFFER_OPTIONS.maxTotalBufferSize;
const cdpCaptureDrainQuietWindowMs = 250;
// Hosted runners can need extra time to finish font requests and CDP metadata after navigation.
const cdpCaptureDrainMaxWaitMs = 30_000;
let observedDownloadEvents = 0;
let capturedBrowserBodyBytes = 0;
let reservedBrowserResponseBytes = 0;
let cdpBodyRecoveries = 0;
let cdpBodyFailures = 0;
let cdpBodyFallbacks = 0;
let fetchBodyReads = 0;
let fetchBodyRecoveries = 0;
let fetchBodyFailures = 0;
let fetchBodyLimitSkips = 0;
let browserResponseBodyReads = 0;
let browserResponseBodyRecoveries = 0;
let browserResponseBodyFailures = 0;
let browserResponseBodyLimitSkips = 0;
let browserResponseEventMessages = 0;
type BrowserResponseEventCaptureState = {
  settled: boolean;
  result?: HarCaptureResult;
};
let browserResponseEventCaptureStates: BrowserResponseEventCaptureState[] = [];
let browserResponseRecordFailures = 0;
let pausedResponseMessages = 0;
let pausedResponseRecordFailures = 0;
let cdpCacheObservations: CdpCacheResponseObservation[] = [];
let cdpTimingObservations: CdpRequestTimingObservation[] = [];
let cdpWire304Responses = 0;
let cdpWire304Ambiguous = 0;
let cdpExtraInfoTracker = createCdpExtraInfoTracker();
let cdpActivitySignal = createCdpActivitySignal();
let cdpInFlightSameOriginRequests = new Map<string, unknown>();
let pendingCaptureOperations = new Set<Promise<unknown>>();
let pendingFetchContinuations = new Set<Promise<void>>();
let cdpCaptureDrainDeadlineAtMs: number | undefined;
let cdpCaptureDrainFailed = false;
let captureOperationFailed = false;
let fetchContinuationCount = 0;
let activeCapturePage: Page | undefined;
let activeCdpSession:
  | Awaited<ReturnType<BrowserContext['newCDPSession']>>
  | undefined;

type DownloadBodyCapture = {
  matched: boolean;
  body?: Buffer;
};

type CdpBodyCapture = {
  body?: Buffer;
  errorClass?: 'protocol_unavailable' | 'size_limit';
};

type CdpFetchRequestPaused = {
  requestId: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    postData?: string;
  };
  responseStatusCode?: number;
  responseStatusText?: string;
  responseHeaders?: HarHeader[];
  resourceType?: string;
};

type CdpFetchBodyCapture = {
  body?: Buffer;
  errorClass?: 'protocol_unavailable' | 'size_limit';
};

type BrowserResponseBodyCapture = {
  attempted: boolean;
  body?: Buffer;
  fromFetch?: boolean;
};

const cdpBodies = new Map<string, Promise<CdpBodyCapture>[]>();
const fetchBodies = new Map<string, Promise<CdpFetchBodyCapture>[]>();

function trackCaptureOperation<T>(
  operation: Promise<T>,
  continuation = false
): Promise<T> {
  const tracked: Promise<T> = operation.then(
    (result) => {
      pendingCaptureOperations.delete(tracked);
      if (continuation)
        pendingFetchContinuations.delete(tracked as Promise<void>);
      cdpActivitySignal.notify();
      return result;
    },
    (error: unknown) => {
      captureOperationFailed = true;
      pendingCaptureOperations.delete(tracked);
      if (continuation)
        pendingFetchContinuations.delete(tracked as Promise<void>);
      cdpActivitySignal.notify();
      throw error;
    }
  );
  pendingCaptureOperations.add(tracked);
  if (continuation) {
    pendingFetchContinuations.add(tracked as Promise<void>);
    fetchContinuationCount += 1;
  }
  cdpActivitySignal.notify();
  void tracked.catch(() => undefined);
  return tracked;
}

function cdpCaptureDrainState() {
  return {
    inFlightRequests: cdpInFlightSameOriginRequests.size,
    pendingOperations: pendingCaptureOperations.size,
    pendingContinuations: pendingFetchContinuations.size,
    pendingExtraInfo: countPendingCdpExtraInfo(cdpExtraInfoTracker),
    reliable: !captureOperationFailed && !cdpCaptureDrainFailed,
  };
}

function releaseActiveCapturePageListeners(): void {
  const page = activeCapturePage;
  activeCapturePage = undefined;
  if (!page) return;
  page.off('response', captureBinaryResponse);
  page.off('download', trackDownload);
}

function cdpBodyKey(url: string, method: string, status: number): string {
  return `${method.toUpperCase()}\u0000${url}\u0000${status}`;
}

function cdpRequestKey(url: string, method: string): string {
  return `${method.toUpperCase()}\u0000${url}`;
}

function enqueueFetchBody(
  url: string,
  method: string,
  status: number,
  body: Promise<CdpFetchBodyCapture>
): void {
  const key = cdpBodyKey(url, method, status);
  const queue = fetchBodies.get(key) ?? [];
  queue.push(body);
  fetchBodies.set(key, queue);
}

async function takeFetchBody(
  url: string,
  method: string,
  status: number
): Promise<CdpFetchBodyCapture | undefined> {
  const key = cdpBodyKey(url, method, status);
  const queue = fetchBodies.get(key);
  const body = queue?.shift();
  if (queue && queue.length === 0) fetchBodies.delete(key);
  return body;
}

function discardFetchBody(url: string, method: string, status: number): void {
  const key = cdpBodyKey(url, method, status);
  const queue = fetchBodies.get(key);
  queue?.shift();
  if (queue && queue.length === 0) fetchBodies.delete(key);
}

function captureCdpBody(
  session: Awaited<ReturnType<BrowserContext['newCDPSession']>>,
  requestId: string,
  frameId: string | undefined,
  url: string,
  method: string,
  status: number,
  encodedDataLength: number
): void {
  const key = cdpBodyKey(url, method, status);
  const body = trackCaptureOperation(
    (async (): Promise<CdpBodyCapture> => {
      if (
        !isCaptureWithinLimits(
          encodedDataLength,
          capturedBrowserBodyBytes + reservedBrowserResponseBytes,
          maxCapturedDownloadBytes,
          maxCapturedCdpBytes
        )
      ) {
        cdpBodyFailures += 1;
        return { errorClass: 'size_limit' };
      }
      try {
        const result = await session.send('Network.getResponseBody', {
          requestId,
        });
        const bytes = Buffer.from(
          result.body,
          result.base64Encoded ? 'base64' : 'utf8'
        );
        if (
          !isCaptureWithinLimits(
            bytes.length,
            capturedBrowserBodyBytes + reservedBrowserResponseBytes,
            maxCapturedDownloadBytes,
            maxCapturedCdpBytes
          )
        ) {
          cdpBodyFailures += 1;
          return { errorClass: 'size_limit' };
        }
        capturedBrowserBodyBytes += bytes.length;
        cdpBodyRecoveries += 1;
        return { body: bytes };
      } catch {
        cdpBodyFailures += 1;
        if (!frameId) return { errorClass: 'protocol_unavailable' };
        const fallback = await readPageResourceBody(
          {
            getResourceTree: async () =>
              (await session.send('Page.getResourceTree')).frameTree,
            getResourceContent: (resourceFrameId, resourceUrl) =>
              session.send('Page.getResourceContent', {
                frameId: resourceFrameId,
                url: resourceUrl,
              }),
          },
          {
            frameId,
            url,
            allowedOrigin,
            capturedBytes:
              capturedBrowserBodyBytes + reservedBrowserResponseBytes,
          }
        );
        if (
          !fallback.body ||
          !isCaptureWithinLimits(
            fallback.body.length,
            capturedBrowserBodyBytes + reservedBrowserResponseBytes,
            maxCapturedDownloadBytes,
            maxCapturedCdpBytes
          )
        ) {
          return { errorClass: fallback.errorClass ?? 'size_limit' };
        }
        capturedBrowserBodyBytes += fallback.body.length;
        return { body: fallback.body };
      }
    })()
  );
  const queue = cdpBodies.get(key) ?? [];
  queue.push(body);
  cdpBodies.set(key, queue);
}

async function readPausedResponseBody(
  session: Awaited<ReturnType<BrowserContext['newCDPSession']>>,
  event: CdpFetchRequestPaused,
  responseHeaders: HarHeader[]
): Promise<CdpFetchBodyCapture> {
  const contentLength = responseHeaders.find(
    ({ name }) => name.toLowerCase() === 'content-length'
  )?.value;
  const expectedBytes = Number(contentLength);
  if (
    !contentLength ||
    !/^\d+$/.test(contentLength) ||
    !Number.isSafeInteger(expectedBytes) ||
    !isCaptureWithinLimits(
      expectedBytes,
      capturedBrowserBodyBytes + reservedBrowserResponseBytes,
      maxCapturedDownloadBytes,
      maxCapturedCdpBytes
    )
  ) {
    fetchBodyLimitSkips += 1;
    return { errorClass: 'size_limit' };
  }

  reservedBrowserResponseBytes += expectedBytes;
  fetchBodyReads += 1;
  try {
    const result = await session.send('Fetch.getResponseBody', {
      requestId: event.requestId,
    });
    const decoded = decodeBoundedResponseBody(
      result.body,
      result.base64Encoded,
      capturedBrowserBodyBytes + reservedBrowserResponseBytes - expectedBytes,
      maxCapturedDownloadBytes,
      maxCapturedCdpBytes
    );
    if (!decoded.body || decoded.body.length === 0) {
      fetchBodyFailures += 1;
      return { errorClass: decoded.errorClass ?? 'protocol_unavailable' };
    }
    capturedBrowserBodyBytes += decoded.body.length;
    fetchBodyRecoveries += 1;
    return { body: decoded.body };
  } catch {
    fetchBodyFailures += 1;
    return { errorClass: 'protocol_unavailable' };
  } finally {
    reservedBrowserResponseBytes -= expectedBytes;
  }
}

async function attachCdpCapture(
  context: BrowserContext,
  page: Page
): Promise<Awaited<ReturnType<BrowserContext['newCDPSession']>>> {
  const session = await context.newCDPSession(page);
  const requests = new Map<
    string,
    {
      url: string;
      method: string;
      frameId?: string;
      redirected: boolean;
      timingObservation: CdpRequestTimingObservation;
    }
  >();
  const responses = new Map<
    string,
    {
      url: string;
      method: string;
      status: number;
      mimeType: string;
      frameId?: string;
      cacheMetadata: {
        fromDiskCache?: boolean;
        fromServiceWorker?: boolean;
        fromPrefetchCache?: boolean;
        fromEarlyHints?: boolean;
      };
      cacheObservation: CdpCacheResponseObservation;
      timingObservation: CdpRequestTimingObservation;
    }
  >();
  const requestsServedFromCache = new Set<string>();
  session.on(
    'Network.requestWillBeSent',
    (event: {
      requestId: string;
      frameId?: string;
      request: { url: string; method: string };
      type?: string;
      wallTime?: number;
      redirectHasExtraInfo?: boolean;
      redirectResponse?: unknown;
    }) => {
      cdpActivitySignal.notify();
      const previousRequest = requests.get(event.requestId);
      const redirected =
        previousRequest !== undefined || event.redirectResponse !== undefined;
      if (previousRequest) {
        previousRequest.redirected = true;
        previousRequest.timingObservation.redirected = true;
      }
      if (redirected) {
        setCdpExtraInfoExpectation(
          cdpExtraInfoTracker,
          event.requestId,
          event.redirectHasExtraInfo
        );
      }
      if (isAllowedOrigin(event.request.url)) {
        cdpInFlightSameOriginRequests.set(event.requestId, event.type);
      } else {
        cdpInFlightSameOriginRequests.delete(event.requestId);
      }
      startCdpExtraInfoHop(
        cdpExtraInfoTracker,
        event.requestId,
        isAllowedOrigin(event.request.url),
        redirected
      );
      const extraInfoHop = cdpExtraInfoTracker.activeHopByRequestId.get(
        event.requestId
      );
      responses.delete(event.requestId);
      requestsServedFromCache.delete(event.requestId);
      requests.delete(event.requestId);
      if (isAllowedOrigin(event.request.url)) {
        const timingObservation: CdpRequestTimingObservation = {
          correlationKey: cdpRequestKey(
            event.request.url,
            event.request.method
          ),
          wallTimeMs:
            typeof event.wallTime === 'number' &&
            Number.isFinite(event.wallTime) &&
            event.wallTime > 0
              ? event.wallTime * 1000
              : undefined,
          redirected,
          extraInfoHop,
          cacheEventObserved: false,
          loadingFinished: false,
        };
        if (typeof event.type === 'string') {
          timingObservation.resourceType = event.type;
        }
        cdpTimingObservations.push(timingObservation);
        requests.set(event.requestId, {
          url: event.request.url,
          method: event.request.method,
          frameId: event.frameId,
          redirected,
          timingObservation,
        });
      }
    }
  );
  session.on(
    'Network.responseReceived',
    (event: {
      requestId: string;
      response: {
        url: string;
        status: number;
        mimeType: string;
        fromDiskCache?: boolean;
        fromServiceWorker?: boolean;
        fromPrefetchCache?: boolean;
        fromEarlyHints?: boolean;
      };
      type?: string;
      hasExtraInfo?: boolean;
    }) => {
      cdpActivitySignal.notify();
      if (
        cdpInFlightSameOriginRequests.has(event.requestId) &&
        isAllowedOrigin(event.response.url)
      ) {
        cdpInFlightSameOriginRequests.set(event.requestId, event.type);
      }
      const responseStatusAssociation = recordCdpResponseStatus(
        cdpExtraInfoTracker,
        event.requestId,
        event.response.status,
        isAllowedOrigin(event.response.url)
      );
      if (
        event.response.status === 304 &&
        isAllowedOrigin(event.response.url) &&
        responseStatusAssociation.countNetwork304
      ) {
        const response304Outcome = classifyCdpWire304(
          304,
          responseStatusAssociation.known && responseStatusAssociation.inScope,
          responseStatusAssociation.redirected ||
            responseStatusAssociation.ambiguous
        );
        if (response304Outcome === 'wire_304') cdpWire304Responses += 1;
        if (response304Outcome === 'ambiguous') cdpWire304Ambiguous += 1;
      }
      setCdpExtraInfoExpectation(
        cdpExtraInfoTracker,
        event.requestId,
        event.hasExtraInfo
      );
      const request = requests.get(event.requestId);
      if (!request || !isAllowedOrigin(event.response.url)) return;
      const cacheMetadata = {
        fromDiskCache: event.response.fromDiskCache,
        fromServiceWorker: event.response.fromServiceWorker,
        fromPrefetchCache: event.response.fromPrefetchCache,
        fromEarlyHints: event.response.fromEarlyHints,
      };
      request.timingObservation.responseHasExtraInfo = event.hasExtraInfo;
      if (typeof event.type === 'string') {
        request.timingObservation.resourceType = event.type;
      }
      request.timingObservation.cacheEventObserved =
        requestsServedFromCache.has(event.requestId);
      const cacheObservation: CdpCacheResponseObservation = {
        correlationKey: cdpBodyKey(
          event.response.url,
          request.method,
          event.response.status
        ),
        source: classifyCdpCacheSource({
          ...cacheMetadata,
          servedFromCache: requestsServedFromCache.has(event.requestId),
        }),
      };
      request.timingObservation.source = cacheObservation.source;
      cdpCacheObservations.push(cacheObservation);
      responses.set(event.requestId, {
        ...request,
        url: event.response.url,
        status: event.response.status,
        mimeType: event.response.mimeType,
        cacheMetadata,
        cacheObservation,
        timingObservation: request.timingObservation,
      });
      requestsServedFromCache.delete(event.requestId);
    }
  );
  session.on(
    'Network.requestServedFromCache',
    (event: { requestId: string }) => {
      cdpActivitySignal.notify();
      const response = responses.get(event.requestId);
      if (response) {
        response.timingObservation.cacheEventObserved = true;
        response.cacheObservation.source = classifyCdpCacheSource({
          ...response.cacheMetadata,
          servedFromCache: true,
        });
        response.timingObservation.source = response.cacheObservation.source;
      } else {
        requestsServedFromCache.add(event.requestId);
      }
    }
  );
  session.on(
    'Network.responseReceivedExtraInfo',
    (event: { requestId: string; statusCode: number }) => {
      cdpActivitySignal.notify();
      const association = recordCdpExtraInfo(
        cdpExtraInfoTracker,
        event.requestId,
        event.statusCode
      );
      if (event.statusCode === 304 && association.countNetwork304) {
        const outcome = classifyCdpExtraInfo304(association);
        if (outcome === 'wire_304') cdpWire304Responses += 1;
        if (outcome === 'ambiguous') cdpWire304Ambiguous += 1;
      }
    }
  );
  session.on(
    'Network.loadingFinished',
    (event: { requestId: string; encodedDataLength: number }) => {
      cdpActivitySignal.notify();
      cdpInFlightSameOriginRequests.delete(event.requestId);
      const response = responses.get(event.requestId);
      if (response) response.timingObservation.loadingFinished = true;
      responses.delete(event.requestId);
      requestsServedFromCache.delete(event.requestId);
      if (!response) return;
      const contentType = response.mimeType.toLowerCase();
      const textual =
        /^text\//.test(contentType) ||
        /(?:json|javascript|xml|csv|spreadsheet|excel)/.test(contentType);
      if (!textual) return;
      captureCdpBody(
        session,
        event.requestId,
        response.frameId,
        response.url,
        response.method,
        response.status,
        event.encodedDataLength
      );
    }
  );
  session.on('Network.loadingFailed', (event: { requestId: string }) => {
    cdpActivitySignal.notify();
    cdpInFlightSameOriginRequests.delete(event.requestId);
    const response = responses.get(event.requestId);
    if (response) response.timingObservation.loadingFinished = true;
    responses.delete(event.requestId);
    requestsServedFromCache.delete(event.requestId);
  });
  session.on('Fetch.requestPaused', (event: CdpFetchRequestPaused) => {
    cdpActivitySignal.notify();
    const responseHeaders = event.responseHeaders ?? [];
    const isBinaryResponse =
      event.responseStatusCode !== undefined &&
      classifyUnavailableBody(
        event.request.method,
        event.responseStatusCode,
        responseHeaders,
        event.resourceType?.toLowerCase() ?? ''
      ) === 'binary_media';
    if (!isAllowedOrigin(event.request.url) || !isBinaryResponse) {
      trackCaptureOperation(
        session
          .send('Fetch.continueRequest', { requestId: event.requestId })
          .then(() => undefined)
          .catch(() => {
            pausedResponseRecordFailures += 1;
          }),
        true
      );
      return;
    }

    pausedResponseMessages += 1;
    const capture = trackCaptureOperation(
      (async (): Promise<CdpFetchBodyCapture> => {
        try {
          return await readPausedResponseBody(session, event, responseHeaders);
        } catch {
          pausedResponseRecordFailures += 1;
          return { errorClass: 'protocol_unavailable' };
        } finally {
          const continuation = trackCaptureOperation(
            session
              .send('Fetch.continueRequest', { requestId: event.requestId })
              .then(() => undefined)
              .catch(() => {
                pausedResponseRecordFailures += 1;
              }),
            true
          );
          await continuation;
        }
      })()
    );
    enqueueFetchBody(
      event.request.url,
      event.request.method,
      event.responseStatusCode ?? 0,
      capture
    );
  });
  await session.send('Page.enable');
  await session.send('Network.enable', CDP_RESPONSE_BUFFER_OPTIONS);
  await session.send('Fetch.enable', {
    patterns: [{ urlPattern: `${allowedOrigin}/*`, requestStage: 'Response' }],
  });
  return session;
}

function takeCdpBody(
  url: string,
  method: string,
  status: number
): Promise<CdpBodyCapture | undefined> {
  const key = cdpBodyKey(url, method, status);
  const queue = cdpBodies.get(key);
  const body = queue?.shift();
  if (queue && queue.length === 0) cdpBodies.delete(key);
  return body ?? Promise.resolve(undefined);
}

function discardCdpBody(url: string, method: string, status: number): void {
  const key = cdpBodyKey(url, method, status);
  const queue = cdpBodies.get(key);
  queue?.shift();
  if (queue && queue.length === 0) cdpBodies.delete(key);
}

function isAllowedOrigin(url: string): boolean {
  try {
    return new URL(url).origin === allowedOrigin;
  } catch {
    return false;
  }
}

function fileToken(testInfo: {
  titlePath: string[];
  retry: number;
  workerIndex: number;
}): string {
  return createHash('sha256')
    .update(
      `${testInfo.titlePath.join('\u0000')}\u0000${testInfo.retry}\u0000${testInfo.workerIndex}`
    )
    .digest('hex')
    .slice(0, 20);
}

function headerPairs(
  headers: Record<string, string> | HarHeader[]
): HarHeader[] {
  if (Array.isArray(headers))
    return headers.map(({ name, value }) => ({ name, value }));
  return Object.entries(headers).map(([name, value]) => ({ name, value }));
}

async function readDownloadBody(
  download: Download
): Promise<Buffer | undefined> {
  try {
    const stream = await download.createReadStream();
    if (!stream) return undefined;
    return await readDownloadBytes(stream, maxCapturedDownloadBytes);
  } catch {
    return undefined;
  }
}

function trackDownload(download: Download): void {
  observedDownloadEvents += 1;
  const key = download.url();
  const body = trackCaptureOperation(readDownloadBody(download));
  const waiter = downloadBodyWaiters.get(key);
  if (waiter) {
    downloadBodyWaiters.delete(key);
    waiter(body);
  } else {
    downloadBodies.set(key, body);
  }
}

function captureBrowserResponseBody(
  response: BrowserResponse
): Promise<BrowserResponseBodyCapture> {
  if (!isAllowedOrigin(response.url())) {
    return Promise.resolve({ attempted: false });
  }

  const request = response.request();
  const responseHeaders = headerPairs(response.headers());
  if (
    classifyUnavailableBody(
      request.method(),
      response.status(),
      responseHeaders,
      request.resourceType()
    ) !== 'binary_media'
  ) {
    return Promise.resolve({ attempted: false });
  }

  const contentLengthHeader = response.headers()['content-length'];
  const contentLength = Number(contentLengthHeader);
  if (
    !contentLengthHeader ||
    !/^\d+$/.test(contentLengthHeader) ||
    !Number.isSafeInteger(contentLength) ||
    !isCaptureWithinLimits(
      contentLength,
      capturedBrowserBodyBytes + reservedBrowserResponseBytes,
      maxCapturedDownloadBytes,
      maxCapturedCdpBytes
    )
  ) {
    browserResponseBodyLimitSkips += 1;
    return Promise.resolve({ attempted: false });
  }

  reservedBrowserResponseBytes += contentLength;
  browserResponseBodyReads += 1;
  let bodyRead: Promise<Buffer>;
  try {
    bodyRead = response.body();
  } catch {
    reservedBrowserResponseBytes -= contentLength;
    browserResponseBodyFailures += 1;
    return Promise.resolve({ attempted: true });
  }

  return bodyRead
    .then((body) => {
      reservedBrowserResponseBytes -= contentLength;
      if (
        body.length === 0 ||
        !isCaptureWithinLimits(
          body.length,
          capturedBrowserBodyBytes + reservedBrowserResponseBytes,
          maxCapturedDownloadBytes,
          maxCapturedCdpBytes
        )
      ) {
        browserResponseBodyFailures += 1;
        return { attempted: true };
      }
      capturedBrowserBodyBytes += body.length;
      browserResponseBodyRecoveries += 1;
      return { attempted: true, body };
    })
    .catch(() => {
      reservedBrowserResponseBytes -= contentLength;
      browserResponseBodyFailures += 1;
      return { attempted: true };
    });
}

function captureBinaryResponse(response: BrowserResponse): void {
  if (!isAllowedOrigin(response.url())) return;

  const request = response.request();
  const responseHeaders = headerPairs(response.headers());
  if (
    classifyUnavailableBody(
      request.method(),
      response.status(),
      responseHeaders,
      request.resourceType()
    ) !== 'binary_media'
  ) {
    return;
  }

  browserResponseEventMessages += 1;
  const captureState: BrowserResponseEventCaptureState = { settled: false };
  browserResponseEventCaptureStates.push(captureState);
  trackCaptureOperation(
    (async () => {
      const fetchBody = await takeFetchBody(
        response.url(),
        request.method(),
        response.status()
      );
      const bodyCapture = fetchBody?.body
        ? { attempted: true, body: fetchBody.body, fromFetch: true }
        : await captureBrowserResponseBody(response);
      return toHarEntry(response, request, bodyCapture);
    })()
      .catch(() => {
        browserResponseRecordFailures += 1;
        return undefined;
      })
      .then((result) => {
        captureState.settled = true;
        captureState.result = result;
        cdpActivitySignal.notify();
        return result;
      })
  );
}

async function takeDownloadBody(url: string): Promise<DownloadBodyCapture> {
  const existing = downloadBodies.get(url);
  if (existing) {
    downloadBodies.delete(url);
    return { matched: true, body: await existing };
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      downloadBodyWaiters.delete(url);
      resolve({ matched: false });
    }, 100);
    downloadBodyWaiters.set(url, (body) => {
      clearTimeout(timer);
      downloadBodyWaiters.delete(url);
      void body.then(
        (bytes) => resolve({ matched: true, body: bytes }),
        () => resolve({ matched: true })
      );
    });
  });
}

type CapturedResponseBody = {
  body: Buffer;
  bodyUnavailable: boolean;
  bodyFailure: boolean;
  bodyUnavailableReason?: BodyUnavailableReason;
  downloadEventMatched?: boolean;
  downloadBodyRecovered?: boolean;
  fetchBodyRecovered?: boolean;
  cdpBodyRecovered?: boolean;
  cdpBodyErrorClass?: CdpBodyCapture['errorClass'];
};

async function recoverResponseBody(
  response: BrowserResponse,
  request: Request,
  responseHeaders: HarHeader[]
): Promise<CapturedResponseBody> {
  const downloadedBody = await takeDownloadBody(request.url());
  if (downloadedBody.body !== undefined) {
    return {
      body: downloadedBody.body,
      bodyUnavailable: false,
      bodyFailure: false,
      downloadEventMatched: downloadedBody.matched,
      downloadBodyRecovered: true,
    };
  }

  const fetchBody = await takeFetchBody(
    response.url(),
    request.method(),
    response.status()
  );
  if (fetchBody?.body !== undefined) {
    return {
      body: fetchBody.body,
      bodyUnavailable: false,
      bodyFailure: false,
      downloadEventMatched: downloadedBody.matched,
      fetchBodyRecovered: true,
    };
  }

  const cdpBody = await takeCdpBody(
    response.url(),
    request.method(),
    response.status()
  );
  const cdpBodyErrorClass = cdpBody?.errorClass ?? fetchBody?.errorClass;
  if (cdpBody?.body !== undefined) {
    cdpBodyFallbacks += 1;
    return {
      body: cdpBody.body,
      bodyUnavailable: false,
      bodyFailure: false,
      downloadEventMatched: downloadedBody.matched,
      cdpBodyRecovered: true,
      ...(cdpBodyErrorClass ? { cdpBodyErrorClass } : {}),
    };
  }

  const bodyUnavailableReason = classifyUnavailableBody(
    request.method(),
    response.status(),
    responseHeaders,
    request.resourceType()
  );
  const bodyFailure = isUnavailableBodyFatal(bodyUnavailableReason);
  return {
    body: Buffer.alloc(0),
    bodyUnavailable: true,
    bodyFailure,
    bodyUnavailableReason,
    downloadEventMatched: downloadedBody.matched,
    ...(cdpBodyErrorClass ? { cdpBodyErrorClass } : {}),
  };
}

async function readResponseBody(
  response: BrowserResponse,
  request: Request,
  responseHeaders: HarHeader[],
  responseBodyCapture?: BrowserResponseBodyCapture
): Promise<CapturedResponseBody> {
  try {
    if (
      responseBodyCapture &&
      (!responseBodyCapture.attempted || !responseBodyCapture.body)
    ) {
      throw new Error('browser_response_body_unavailable');
    }

    const body = responseBodyCapture?.body ?? (await response.body());
    const fetchBodyRecovered = responseBodyCapture?.fromFetch === true;
    if (!fetchBodyRecovered) {
      discardFetchBody(response.url(), request.method(), response.status());
    }
    discardCdpBody(response.url(), request.method(), response.status());
    return {
      body,
      bodyUnavailable: false,
      bodyFailure: false,
      ...(fetchBodyRecovered ? { fetchBodyRecovered } : {}),
    };
  } catch {
    return recoverResponseBody(response, request, responseHeaders);
  }
}

async function createHarCaptureResult(
  response: BrowserResponse,
  request: Request,
  requestUrl: URL,
  requestHeaders: HarHeader[],
  requestBody: Buffer | null,
  responseHeaders: HarHeader[],
  contentType: string,
  bodyCapture: CapturedResponseBody
): Promise<HarCaptureResult> {
  const responseBody = bodyCapture.body;
  const isText =
    /^text\//i.test(contentType) ||
    /(?:json|javascript|xml|x-www-form-urlencoded|graphql)/i.test(contentType);
  const responseText = isText
    ? responseBody.toString('utf8')
    : responseBody.toString('base64');
  const location =
    responseHeaders.find(({ name }) => name.toLowerCase() === 'location')
      ?.value ?? '';
  const postData = requestBody
    ? {
        mimeType:
          requestHeaders.find(
            ({ name }) => name.toLowerCase() === 'content-type'
          )?.value ?? 'application/octet-stream',
        text: requestBody.toString('utf8'),
      }
    : undefined;

  return {
    bodyUnavailable: bodyCapture.bodyUnavailable,
    bodyFailure: bodyCapture.bodyFailure,
    cacheCorrelationKey: cdpBodyKey(
      response.url(),
      request.method(),
      response.status()
    ),
    timingCorrelationKey: cdpRequestKey(request.url(), request.method()),
    browserRequestStartTimeMs: request.timing().startTime,
    browserRequestRedirected: Boolean(
      request.redirectedFrom() || request.redirectedTo()
    ),
    ...(bodyCapture.bodyUnavailableReason
      ? { bodyUnavailableReason: bodyCapture.bodyUnavailableReason }
      : {}),
    ...(bodyCapture.downloadEventMatched
      ? { downloadEventMatched: bodyCapture.downloadEventMatched }
      : {}),
    ...(bodyCapture.downloadBodyRecovered
      ? { downloadBodyRecovered: bodyCapture.downloadBodyRecovered }
      : {}),
    ...(bodyCapture.fetchBodyRecovered
      ? { fetchBodyRecovered: bodyCapture.fetchBodyRecovered }
      : {}),
    ...(bodyCapture.cdpBodyRecovered
      ? { cdpBodyRecovered: bodyCapture.cdpBodyRecovered }
      : {}),
    ...(bodyCapture.cdpBodyErrorClass
      ? { cdpBodyErrorClass: bodyCapture.cdpBodyErrorClass }
      : {}),
    ...(bodyCapture.bodyFailure
      ? {
          bodyFailureMethodStatus: safeMethodStatus(
            request.method(),
            response.status()
          ),
        }
      : {}),
    entry: {
      startedDateTime: new Date().toISOString(),
      time: 0,
      request: {
        method: request.method(),
        url: request.url(),
        httpVersion: await response.httpVersion(),
        cookies: [],
        headers: requestHeaders,
        queryString: Array.from(requestUrl.searchParams, ([name, value]) => ({
          name,
          value,
        })),
        headersSize: -1,
        bodySize: requestBody?.length ?? 0,
        ...(postData ? { postData } : {}),
      },
      response: {
        status: response.status(),
        statusText: response.statusText(),
        httpVersion: await response.httpVersion(),
        cookies: [],
        headers: responseHeaders,
        content: {
          size: responseBody.length,
          mimeType: contentType,
          text: responseText,
          ...(!isText ? { encoding: 'base64' } : {}),
        },
        redirectURL: location,
        headersSize: -1,
        bodySize: responseBody.length,
      },
      cache: {},
      timings: { send: 0, wait: 0, receive: 0 },
    },
  };
}

async function toHarEntry(
  response: BrowserResponse,
  request: Request,
  responseBodyCapture?: BrowserResponseBodyCapture
): Promise<HarCaptureResult> {
  const requestUrl = new URL(request.url());
  const requestHeaders = headerPairs(await request.allHeaders());
  const requestBody = request.postDataBuffer();
  const responseHeaders = headerPairs(await response.headersArray());
  const contentType =
    responseHeaders.find(({ name }) => name.toLowerCase() === 'content-type')
      ?.value ?? 'application/octet-stream';
  const bodyCapture = await readResponseBody(
    response,
    request,
    responseHeaders,
    responseBodyCapture
  );

  return createHarCaptureResult(
    response,
    request,
    requestUrl,
    requestHeaders,
    requestBody,
    responseHeaders,
    contentType,
    bodyCapture
  );
}

type RequestOptions = Record<string, unknown>;

function requestBody(
  options: RequestOptions
): { text: string; mimeType: string } | undefined {
  if (options.data !== undefined) {
    if (typeof options.data === 'string') {
      return { text: options.data, mimeType: 'text/plain' };
    }
    if (Buffer.isBuffer(options.data)) {
      return {
        text: options.data.toString('utf8'),
        mimeType: 'application/octet-stream',
      };
    }
    if (options.data instanceof Uint8Array) {
      return {
        text: Buffer.from(options.data).toString('utf8'),
        mimeType: 'application/octet-stream',
      };
    }
    if (typeof options.data === 'object' && options.data !== null) {
      return {
        text: JSON.stringify(options.data),
        mimeType: 'application/json',
      };
    }
  }
  if (typeof options.form === 'object' && options.form !== null) {
    const values = Object.entries(options.form as Record<string, unknown>).map(
      ([key, value]) => [key, String(value)]
    );
    return {
      text: new URLSearchParams(values).toString(),
      mimeType: 'application/x-www-form-urlencoded',
    };
  }
  if (options.multipart !== undefined) return undefined;
  return undefined;
}

function mergeHeaders(
  defaults: Record<string, string>,
  provided: unknown,
  body: { text: string; mimeType: string } | undefined,
  cookie: string | undefined
): HarHeader[] {
  const headers = new Map<string, HarHeader>();
  for (const [name, value] of Object.entries(defaults)) {
    headers.set(name.toLowerCase(), { name, value });
  }
  if (provided && typeof provided === 'object') {
    for (const [name, value] of Object.entries(
      provided as Record<string, unknown>
    )) {
      headers.set(name.toLowerCase(), { name, value: String(value) });
    }
  }
  if (body && !headers.has('content-type')) {
    headers.set('content-type', { name: 'content-type', value: body.mimeType });
  }
  if (cookie && !headers.has('cookie'))
    headers.set('cookie', { name: 'cookie', value: cookie });
  return Array.from(headers.values());
}

async function cookieHeader(
  request: APIRequestContext,
  url: URL
): Promise<string | undefined> {
  const state = await request.storageState();
  const now = Date.now() / 1000;
  const matches = state.cookies.filter((cookie) => {
    const domain = cookie.domain.replace(/^\./, '').toLowerCase();
    const hostname = url.hostname.toLowerCase();
    const domainMatches =
      hostname === domain || hostname.endsWith(`.${domain}`);
    const pathMatches = url.pathname.startsWith(cookie.path);
    const secureMatches = !cookie.secure || url.protocol === 'https:';
    const notExpired = cookie.expires === -1 || cookie.expires > now;
    return domainMatches && pathMatches && secureMatches && notExpired;
  });
  if (matches.length === 0) return undefined;
  return matches.map(({ name, value }) => `${name}=${value}`).join('; ');
}

async function toApiHarEntry(
  response: APIResponse,
  method: string,
  requestUrl: string,
  requestHeaders: HarHeader[],
  body: { text: string; mimeType: string } | undefined,
  startedDateTime: string
): Promise<HarCaptureResult> {
  const url = new URL(requestUrl);
  const responseHeaders = headerPairs(await response.headersArray());
  const contentType =
    responseHeaders.find(({ name }) => name.toLowerCase() === 'content-type')
      ?.value ?? 'application/octet-stream';
  let responseBody: Buffer;
  let bodyUnavailable = false;
  let bodyFailure = false;
  let bodyUnavailableReason: BodyUnavailableReason | undefined;
  try {
    responseBody = await response.body();
  } catch {
    bodyUnavailableReason = classifyUnavailableBody(
      method,
      response.status(),
      responseHeaders
    );
    bodyFailure = isUnavailableBodyFatal(bodyUnavailableReason);
    bodyUnavailable = true;
    responseBody = Buffer.alloc(0);
  }
  const isText =
    /^text\//i.test(contentType) ||
    /(?:json|javascript|xml|x-www-form-urlencoded|graphql)/i.test(contentType);
  const responseText = isText
    ? responseBody.toString('utf8')
    : responseBody.toString('base64');
  const location =
    responseHeaders.find(({ name }) => name.toLowerCase() === 'location')
      ?.value ?? '';

  return {
    bodyUnavailable,
    bodyFailure,
    ...(bodyUnavailableReason ? { bodyUnavailableReason } : {}),
    ...(bodyFailure
      ? { bodyFailureMethodStatus: safeMethodStatus(method, response.status()) }
      : {}),
    entry: {
      startedDateTime,
      time: 0,
      request: {
        method,
        url: requestUrl,
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: requestHeaders,
        queryString: Array.from(url.searchParams, ([name, value]) => ({
          name,
          value,
        })),
        headersSize: -1,
        bodySize: body?.text.length ?? 0,
        ...(body
          ? { postData: { mimeType: body.mimeType, text: body.text } }
          : {}),
      },
      response: {
        status: response.status(),
        statusText: response.statusText(),
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: responseHeaders,
        content: {
          size: responseBody.length,
          mimeType: contentType,
          text: responseText,
          ...(!isText ? { encoding: 'base64' } : {}),
        },
        redirectURL: location,
        headersSize: -1,
        bodySize: responseBody.length,
      },
      cache: {},
      timings: { send: 0, wait: 0, receive: 0 },
    },
  };
}

async function writeCapture(
  source: 'browser' | 'api-request-context',
  testInfo: { titlePath: string[]; retry: number; workerIndex: number },
  entries: HarEntry[],
  captureError: boolean,
  observed: number,
  bodyUnavailable: number,
  failedMessages: number,
  cacheSkipped = 0,
  bodyUnavailableCacheSkipped = 0,
  wire304Responses = 0,
  wire304Ambiguous = 0,
  cacheEvidenceAmbiguous = 0,
  bodylessCacheCandidates: BodylessCacheCandidateSidecarEntry[] = [],
  bodylessCacheCandidateCount = 0,
  requestTimingMissing = 0,
  browserRequestEvidence: BrowserRequestEvidence[] = []
): Promise<void> {
  if (
    !Number.isSafeInteger(bodylessCacheCandidateCount) ||
    bodylessCacheCandidateCount < 0 ||
    bodylessCacheCandidateCount !== bodylessCacheCandidates.length
  ) {
    throw new Error('bodyless cache candidate count does not match sidecar');
  }
  if (!Number.isSafeInteger(requestTimingMissing) || requestTimingMissing < 0) {
    throw new Error(
      'request timing missing count must be a nonnegative integer'
    );
  }
  const directory = join(captureRoot, source);
  await mkdir(directory, { recursive: true });
  const token = fileToken(testInfo);
  await writeFile(
    join(directory, `${token}.status.json`),
    JSON.stringify({
      complete: !captureError,
      count: entries.length,
      observed,
      cache_skipped: cacheSkipped,
      body_unavailable: bodyUnavailable,
      body_unavailable_cache_skipped: bodyUnavailableCacheSkipped,
      wire_304_responses: wire304Responses,
      wire_304_ambiguous: wire304Ambiguous,
      cache_evidence_ambiguous: cacheEvidenceAmbiguous,
      request_timing_missing: requestTimingMissing,
      bodyless_cache_candidate_count: bodylessCacheCandidateCount,
      bodyless_cache_candidates: bodylessCacheCandidates,
      browser_request_evidence: browserRequestEvidence,
      failed_messages: failedMessages,
    }),
    { encoding: 'utf8', mode: 0o600 }
  );
  if (entries.length === 0) return;
  await writeFile(
    join(directory, `${token}.har`),
    JSON.stringify({
      log: {
        version: '1.2',
        creator: { name: 'lab-solos-security-e2e', version: '1' },
        entries,
      },
    }),
    { encoding: 'utf8', mode: 0o600 }
  );
}

export const test = base.extend({
  page: async ({ page, context }, provide) => {
    downloadBodies.clear();
    downloadBodyWaiters.clear();
    cdpBodies.clear();
    fetchBodies.clear();
    cdpActivitySignal = createCdpActivitySignal();
    cdpInFlightSameOriginRequests = new Map();
    pendingCaptureOperations = new Set();
    pendingFetchContinuations = new Set();
    cdpCaptureDrainDeadlineAtMs = undefined;
    cdpCaptureDrainFailed = false;
    captureOperationFailed = false;
    fetchContinuationCount = 0;
    activeCapturePage = undefined;
    activeCdpSession = undefined;
    browserResponseEventMessages = 0;
    browserResponseEventCaptureStates = [];
    cdpCacheObservations = [];
    cdpTimingObservations = [];
    cdpExtraInfoTracker = createCdpExtraInfoTracker();
    cdpWire304Responses = 0;
    cdpWire304Ambiguous = 0;
    browserResponseRecordFailures = 0;
    pausedResponseMessages = 0;
    pausedResponseRecordFailures = 0;
    observedDownloadEvents = 0;
    capturedBrowserBodyBytes = 0;
    reservedBrowserResponseBytes = 0;
    cdpBodyRecoveries = 0;
    cdpBodyFailures = 0;
    cdpBodyFallbacks = 0;
    fetchBodyReads = 0;
    fetchBodyRecoveries = 0;
    fetchBodyFailures = 0;
    fetchBodyLimitSkips = 0;
    browserResponseBodyReads = 0;
    browserResponseBodyRecoveries = 0;
    browserResponseBodyFailures = 0;
    browserResponseBodyLimitSkips = 0;
    const cdpSession = await attachCdpCapture(context, page);
    activeCapturePage = page;
    activeCdpSession = cdpSession;
    page.on('response', captureBinaryResponse);
    page.on('download', trackDownload);
    try {
      await provide(page);
    } finally {
      cdpCaptureDrainDeadlineAtMs =
        performance.now() + cdpCaptureDrainMaxWaitMs;
      const pageDrainComplete =
        activeCdpSession !== undefined &&
        (await drainCdpCaptureEvents(cdpCaptureDrainState, cdpActivitySignal, {
          quietWindowMs: cdpCaptureDrainQuietWindowMs,
          maxWaitMs: cdpCaptureDrainMaxWaitMs,
          deadlineAtMs: cdpCaptureDrainDeadlineAtMs,
          allowPendingExtraInfo: true,
        }));
      if (!pageDrainComplete) cdpCaptureDrainFailed = true;
    }
  },
  context: async ({ context }, provide, testInfo) => {
    const capturedResults: HarCaptureResult[] = [];
    const capturedBrowserRequests = new WeakSet<Request>();
    let captureError = false;
    let observedMessages = 0;
    let bodyUnavailable = 0;
    const bodyUnavailableClasses = emptyBodyUnavailableCounts();
    const textualUnknownMethods = new Map<string, number>();
    let downloadEventMatches = 0;
    let downloadBodiesRecovered = 0;
    let fetchBodiesRecovered = 0;
    let failedMessages = 0;
    const recordCapturedResult = (captured: HarCaptureResult) => {
      capturedResults.push(captured);
      if (captured.bodyUnavailable) bodyUnavailable += 1;
      if (captured.bodyUnavailableReason) {
        bodyUnavailableClasses[captured.bodyUnavailableReason] += 1;
      }
      if (captured.bodyFailure) {
        const methodStatus = captured.bodyFailureMethodStatus ?? 'OTHER:0';
        textualUnknownMethods.set(
          methodStatus,
          (textualUnknownMethods.get(methodStatus) ?? 0) + 1
        );
      }
      if (captured.downloadEventMatched) downloadEventMatches += 1;
      if (captured.downloadBodyRecovered) downloadBodiesRecovered += 1;
      if (captured.fetchBodyRecovered) fetchBodiesRecovered += 1;
    };
    const captureFinishedRequest = (request: Request) => {
      if (!isAllowedOrigin(request.url())) return;
      if (capturedBrowserRequests.has(request)) return;
      capturedBrowserRequests.add(request);
      cdpActivitySignal.notify();
      const record = trackCaptureOperation(
        request
          .response()
          .then(async (response) => {
            if (!response) {
              captureError = true;
              failedMessages += 1;
              return;
            }
            const responseHeaders = headerPairs(await response.headersArray());
            const unavailableReason = classifyUnavailableBody(
              request.method(),
              response.status(),
              responseHeaders,
              request.resourceType()
            );
            if (unavailableReason === 'binary_media') return;
            observedMessages += 1;
            recordCapturedResult(await toHarEntry(response, request));
          })
          .catch(() => {
            captureError = true;
            failedMessages += 1;
          })
      );
      void record.catch(() => undefined);
    };
    const captureResponseBeforeFinished = (response: BrowserResponse) => {
      const request = response.request();
      const noBodyStatus =
        classifyUnavailableBody(
          request.method(),
          response.status(),
          headerPairs(response.headers()),
          request.resourceType()
        ) === 'no_body_status';
      if (
        !isAllowedOrigin(request.url()) ||
        !noBodyStatus ||
        capturedBrowserRequests.has(request)
      ) {
        return;
      }
      capturedBrowserRequests.add(request);
      cdpActivitySignal.notify();
      const record = trackCaptureOperation(
        (async () => {
          observedMessages += 1;
          recordCapturedResult(
            await toHarEntry(response, request, {
              attempted: true,
              body: Buffer.alloc(0),
            })
          );
        })().catch(() => {
          captureError = true;
          failedMessages += 1;
        })
      );
      void record.catch(() => undefined);
    };

    context.on('requestfinished', captureFinishedRequest);
    context.on('response', captureResponseBeforeFinished);
    try {
      await provide(context);
    } finally {
      try {
        const cdpDrainComplete =
          activeCdpSession !== undefined &&
          (await drainCdpCaptureEvents(
            cdpCaptureDrainState,
            cdpActivitySignal,
            {
              quietWindowMs: cdpCaptureDrainQuietWindowMs,
              maxWaitMs: cdpCaptureDrainMaxWaitMs,
              allowPendingExtraInfo: true,
              ...(cdpCaptureDrainDeadlineAtMs !== undefined
                ? { deadlineAtMs: cdpCaptureDrainDeadlineAtMs }
                : {}),
            }
          ));
        releaseActiveCapturePageListeners();
        if (!cdpDrainComplete) {
          captureError = true;
          failedMessages += 1;
        }
        context.off('requestfinished', captureFinishedRequest);
        context.off('response', captureResponseBeforeFinished);
        observedMessages += browserResponseEventMessages;
        const settledBrowserCaptureStates =
          browserResponseEventCaptureStates.filter((state) => state.settled);
        const settledBrowserCaptures = extractSettledCaptureResults(
          browserResponseEventCaptureStates.map(({ settled, result }) => ({
            settled,
            value: result,
          }))
        );
        const settledCaptureFailures =
          settledBrowserCaptureStates.length - settledBrowserCaptures.length;
        if (settledCaptureFailures > 0) {
          captureError = true;
          failedMessages += settledCaptureFailures;
        }
        if (
          cdpDrainComplete &&
          settledBrowserCaptureStates.length !==
            browserResponseEventCaptureStates.length
        ) {
          captureError = true;
          failedMessages +=
            browserResponseEventCaptureStates.length -
            settledBrowserCaptureStates.length;
        }
        for (const captured of settledBrowserCaptures) {
          recordCapturedResult(captured);
        }
        const cacheSources = correlateCdpCacheSources(
          capturedResults.map((captured) => captured.cacheCorrelationKey ?? ''),
          cdpCacheObservations
        );
        const cacheSourceCounts = emptyCdpCacheSourceCounts();
        const cdpResponseSourceCounts = emptyCdpCacheSourceCounts();
        const bodyUnavailableByCacheSource = emptyCdpCacheSourceCounts();
        for (const observation of cdpCacheObservations) {
          cdpResponseSourceCounts[observation.source] += 1;
        }
        capturedResults.forEach((captured, index) => {
          const source = cacheSources[index];
          captured.cacheSource = source;
          cacheSourceCounts[source] += 1;
          if (captured.bodyUnavailable) {
            bodyUnavailableByCacheSource[source] += 1;
          }
        });
        const timedObservationIndices: number[] = [];
        const timedCacheObservations: TimedCdpCacheObservation[] =
          cdpTimingObservations.flatMap((observation, index) => {
            if (observation.source === undefined) return [];
            timedObservationIndices.push(index);
            return [
              {
                correlationKey: observation.correlationKey,
                wallTimeMs: observation.wallTimeMs,
                source: observation.source,
                redirected: observation.redirected,
              },
            ];
          });
        const temporalCorrelation = correlateCdpCacheSourcesByTime(
          capturedResults.map((captured) => ({
            correlationKey: captured.timingCorrelationKey ?? '',
            startTimeMs: captured.browserRequestStartTimeMs,
            redirected: captured.browserRequestRedirected,
          })),
          timedCacheObservations
        );
        const browserStartTimeNormalization =
          normalizeHarStartedDateTimesByRequestTiming(
            capturedResults.map((captured) => ({
              fallbackStartedDateTime: captured.entry.startedDateTime,
              requestStartTimeMs: captured.browserRequestStartTimeMs,
            }))
          );
        capturedResults.forEach((captured, index) => {
          captured.entry.startedDateTime =
            browserStartTimeNormalization.startedDateTimes[index];
        });
        const extraInfoSummary = summarizeCdpExtraInfo(cdpExtraInfoTracker);
        const pendingExtraInfo =
          extraInfoSummary.missing + extraInfoSummary.unresolved;
        const temporalCacheSourceCounts = emptyCdpCacheSourceCounts();
        const bodyUnavailableByTemporalCacheSource =
          emptyCdpCacheSourceCounts();
        const bodylessCacheCandidateExtraInfo =
          summarizeBodylessCacheCandidateExtraInfo(
            capturedResults.map((captured, index) => {
              const matchedObservationIndex =
                temporalCorrelation.matchedObservationIndices[index];
              const timingObservationIndex =
                matchedObservationIndex === undefined
                  ? undefined
                  : timedObservationIndices[matchedObservationIndex];
              const timingObservation =
                timingObservationIndex === undefined
                  ? undefined
                  : cdpTimingObservations[timingObservationIndex];
              return {
                bodyUnavailable: captured.bodyUnavailable,
                source: temporalCorrelation.sources[index],
                temporalMatchUnique: matchedObservationIndex !== undefined,
                hop: timingObservation?.extraInfoHop,
              };
            })
          );
        const cacheEvidenceAmbiguous =
          bodylessCacheCandidateExtraInfo.ambiguous;
        const bodylessCandidateMetadata: BodylessCacheCandidateMetadata[] =
          capturedResults.flatMap((captured, index) => {
            if (
              !captured.bodyUnavailable ||
              captured.bodyUnavailableReason !== 'binary_media'
            ) {
              return [];
            }
            const matchedObservationIndex =
              temporalCorrelation.matchedObservationIndices[index];
            const timingObservationIndex =
              matchedObservationIndex === undefined
                ? undefined
                : timedObservationIndices[matchedObservationIndex];
            const timingObservation =
              timingObservationIndex === undefined
                ? undefined
                : cdpTimingObservations[timingObservationIndex];
            const method = captured.entry.request.method;
            const url = captured.entry.request.url;
            if (typeof method !== 'string' || typeof url !== 'string') {
              throw new Error(
                'binary cache candidate is missing request method or URL'
              );
            }
            return [
              {
                originalEntryIndex: index,
                method,
                url,
                responseStatus: captured.entry.response.status,
                wallTimeMs: captured.browserRequestStartTimeMs,
                cacheSource: temporalCorrelation.sources[index],
                diagnosticInput: {
                  cacheEventObserved:
                    timingObservation?.cacheEventObserved ?? false,
                  hasExtraInfo: timingObservation?.responseHasExtraInfo,
                  responseExtraInfoStatus:
                    timingObservation?.extraInfoHop?.responseStatusCode,
                  resourceType: timingObservation?.resourceType ?? '',
                  loadingFinished: timingObservation?.loadingFinished ?? false,
                },
              },
            ];
          });
        const bodylessCacheCandidateCdpDiagnostics =
          summarizeBodylessCacheCandidateDiagnostics(
            bodylessCandidateMetadata.map(
              ({ diagnosticInput }) => diagnosticInput
            )
          );
        capturedResults.forEach((captured, index) => {
          const source = temporalCorrelation.sources[index];
          temporalCacheSourceCounts[source] += 1;
          if (captured.bodyUnavailable) {
            bodyUnavailableByTemporalCacheSource[source] += 1;
          }
        });
        const skippedCacheResults = new Set<number>();
        capturedResults.forEach((captured, index) => {
          const source = temporalCorrelation.sources[index];
          const matchedObservationIndex =
            temporalCorrelation.matchedObservationIndices[index];
          const timingObservationIndex =
            matchedObservationIndex === undefined
              ? undefined
              : timedObservationIndices[matchedObservationIndex];
          const timingObservation =
            timingObservationIndex === undefined
              ? undefined
              : cdpTimingObservations[timingObservationIndex];
          const explicitCacheEvent =
            source === 'cache_unspecified'
              ? timingObservation?.cacheEventObserved === true
              : ['disk_cache', 'prefetch_cache', 'early_hints_cache'].includes(
                  source
                );
          const extraInfoIsSafe =
            timingObservation?.extraInfoHop?.contradictory !== true &&
            timingObservation?.extraInfoHop?.responseStatusCode !== 304;
          if (
            canSkipBodylessCacheResponse({
              bodyUnavailable: captured.bodyUnavailable,
              bodyUnavailableReason: captured.bodyUnavailableReason,
              source,
              responseStatus: captured.entry.response.status,
              temporalMatchUnique:
                source !== 'ambiguous' && source !== 'metadata_missing',
              cacheEvidenceReliable:
                explicitCacheEvent &&
                extraInfoIsSafe &&
                pausedResponseRecordFailures === 0,
              wire304Responses: cdpWire304Responses,
              wire304Ambiguous: cdpWire304Ambiguous,
            })
          ) {
            skippedCacheResults.add(index);
          }
        });
        const cacheSkipped = skippedCacheResults.size;
        const retainedEntries = capturedResults
          .filter((_, index) => !skippedCacheResults.has(index))
          .map(({ entry }) => entry);
        const harEntryIndexByOriginalIndex = new Map<number, number>();
        let nextHarEntryIndex = 0;
        capturedResults.forEach((_, originalEntryIndex) => {
          if (skippedCacheResults.has(originalEntryIndex)) return;
          harEntryIndexByOriginalIndex.set(
            originalEntryIndex,
            nextHarEntryIndex
          );
          nextHarEntryIndex += 1;
        });
        const bodylessCacheCandidates = projectBodylessCacheCandidateSidecar(
          bodylessCandidateMetadata.map(
            ({
              originalEntryIndex,
              method,
              url,
              responseStatus,
              wallTimeMs,
              cacheSource,
              diagnosticInput,
            }) => {
              const skipped = skippedCacheResults.has(originalEntryIndex);
              return {
                originalEntryIndex,
                harEntryIndex: skipped
                  ? null
                  : (harEntryIndexByOriginalIndex.get(originalEntryIndex) ??
                    null),
                method,
                url,
                responseStatus,
                wallTimeMs,
                cacheSource,
                bodyUnavailable: true,
                skipped,
                ...diagnosticInput,
              } satisfies BodylessCacheCandidateSidecarInput;
            }
          ),
          retainedEntries.length
        );
        const browserRequestEvidence: BrowserRequestEvidence[] =
          capturedResults.flatMap((_, originalEntryIndex) => {
            const harEntryIndex =
              harEntryIndexByOriginalIndex.get(originalEntryIndex);
            if (harEntryIndex === undefined) return [];
            const matchedObservationIndex =
              temporalCorrelation.matchedObservationIndices[originalEntryIndex];
            const timingObservationIndex =
              matchedObservationIndex === undefined
                ? undefined
                : timedObservationIndices[matchedObservationIndex];
            const timingObservation =
              timingObservationIndex === undefined
                ? undefined
                : cdpTimingObservations[timingObservationIndex];
            const extraInfoStatus =
              timingObservation?.extraInfoHop?.responseStatusCode;
            return [
              {
                har_entry_index: harEntryIndex,
                cache_source: temporalCorrelation.sources[originalEntryIndex],
                cache_event_observed:
                  timingObservation?.cacheEventObserved ?? false,
                has_extra_info: timingObservation?.responseHasExtraInfo ?? null,
                response_extra_info:
                  extraInfoStatus === 304
                    ? 'status304'
                    : typeof extraInfoStatus === 'number'
                      ? 'otherStatus'
                      : 'absent',
                resource_type: timingObservation?.resourceType ?? 'unknown',
                loading_finished: timingObservation?.loadingFinished ?? false,
              },
            ];
          });
        const capturedBodyUnavailable = bodyUnavailable - cacheSkipped;
        if (
          browserResponseRecordFailures > 0 ||
          pausedResponseRecordFailures > 0
        ) {
          captureError = true;
          failedMessages += pausedResponseRecordFailures;
        }
        await writeCapture(
          'browser',
          testInfo,
          retainedEntries,
          captureError,
          observedMessages,
          capturedBodyUnavailable,
          failedMessages,
          cacheSkipped,
          cacheSkipped,
          cdpWire304Responses,
          cdpWire304Ambiguous,
          cacheEvidenceAmbiguous,
          bodylessCacheCandidates,
          bodyUnavailableClasses.binary_media,
          browserStartTimeNormalization.requestTimingMissing,
          browserRequestEvidence
        );
        const cdpDiagnosticFields = [
          'source=browser',
          `test_title=${JSON.stringify(testInfo.title)}`,
          `observed=${observedMessages}`,
          `captured=${retainedEntries.length}`,
          `cache_skipped=${cacheSkipped}`,
          `body_unavailable=${capturedBodyUnavailable}`,
          `body_unavailable_cache_skipped=${cacheSkipped}`,
          `body_unavailable_total=${bodyUnavailable}`,
          `body_classes=${JSON.stringify(bodyUnavailableClasses)}`,
          `request_timing_missing=${browserStartTimeNormalization.requestTimingMissing}`,
          `cdp_response_sources=${JSON.stringify(cdpResponseSourceCounts)}`,
          `cdp_cache_sources=${JSON.stringify(cacheSourceCounts)}`,
          `body_unavailable_by_cache_source=${JSON.stringify(bodyUnavailableByCacheSource)}`,
          `cdp_timing_delta_summary=${JSON.stringify(temporalCorrelation.deltaSummary)}`,
          `cdp_temporal_cache_sources=${JSON.stringify(temporalCacheSourceCounts)}`,
          `body_unavailable_by_temporal_cache_source=${JSON.stringify(bodyUnavailableByTemporalCacheSource)}`,
          `bodyless_cache_candidate_extra_info=${JSON.stringify(bodylessCacheCandidateExtraInfo)}`,
          `bodyless_cache_candidate_cdp_diagnostics=${JSON.stringify(bodylessCacheCandidateCdpDiagnostics)}`,
          `cdp_extra_info_expected=${extraInfoSummary.expected}`,
          `cdp_extra_info_received=${extraInfoSummary.received}`,
          `cdp_extra_info_missing=${extraInfoSummary.missing}`,
          `cdp_extra_info_unexpected=${extraInfoSummary.unexpected}`,
          `cdp_extra_info_unexpected_expected_false=${extraInfoSummary.unexpectedExpectedFalse}`,
          `cdp_extra_info_unmatched=${extraInfoSummary.unmatched}`,
          `cdp_extra_info_ambiguous_events=${extraInfoSummary.ambiguousEvents}`,
          `cdp_extra_info_unresolved=${extraInfoSummary.unresolved}`,
          `cdp_extra_info_contradictory=${extraInfoSummary.contradictory}`,
          `cdp_extra_info_pending=${pendingExtraInfo}`,
          `cdp_extra_info_drain_complete=${cdpDrainComplete}`,
          `wire_304_responses=${cdpWire304Responses}`,
          `wire_304_ambiguous=${cdpWire304Ambiguous}`,
          `cache_evidence_ambiguous=${cacheEvidenceAmbiguous}`,
          `textual_unknown_methods=${JSON.stringify(Object.fromEntries(textualUnknownMethods))}`,
          `fetch_bodies_recovered=${fetchBodiesRecovered}`,
          `download_event_matches=${downloadEventMatches}`,
          `download_bodies_recovered=${downloadBodiesRecovered}`,
          `failed_messages=${failedMessages}`,
          `complete=${!captureError}`,
          `response_messages=${browserResponseEventMessages}`,
          `response_record_failures=${browserResponseRecordFailures}`,
          `paused_binary_responses=${pausedResponseMessages}`,
          `paused_response_record_failures=${pausedResponseRecordFailures}`,
          `fetch_continuations=${fetchContinuationCount}`,
          `pending_capture_operations=${pendingCaptureOperations.size}`,
          `inflight_same_origin_requests=${cdpInFlightSameOriginRequests.size}`,
          `inflight_same_origin_resource_types=${JSON.stringify(summarizeCdpResourceTypes([...cdpInFlightSameOriginRequests.values()]))}`,
          `download_events=${observedDownloadEvents}`,
          `response_body_reads=${browserResponseBodyReads}`,
          `response_body_recoveries=${browserResponseBodyRecoveries}`,
          `response_body_read_failures=${browserResponseBodyFailures}`,
          `response_body_limit_skips=${browserResponseBodyLimitSkips}`,
          `fetch_body_reads=${fetchBodyReads}`,
          `fetch_body_recoveries=${fetchBodyRecoveries}`,
          `fetch_body_read_failures=${fetchBodyFailures}`,
          `fetch_body_limit_skips=${fetchBodyLimitSkips}`,
          `cdp_text_body_reads=${cdpBodyRecoveries}`,
          `cdp_text_body_read_failures=${cdpBodyFailures}`,
          `cdp_text_body_fallbacks=${cdpBodyFallbacks}`,
        ];
        console.info(`[security-zap-capture] ${cdpDiagnosticFields.join(' ')}`);
      } finally {
        releaseActiveCapturePageListeners();
        const session = activeCdpSession;
        activeCdpSession = undefined;
        if (session) {
          try {
            await session.detach();
          } catch {
            // Detach errors are not surfaced; completeness is recorded separately.
          }
        }
        cdpCacheObservations = [];
        cdpTimingObservations = [];
        cdpBodies.clear();
        fetchBodies.clear();
        downloadBodies.clear();
        downloadBodyWaiters.clear();
        pendingCaptureOperations.clear();
        pendingFetchContinuations.clear();
        cdpInFlightSameOriginRequests.clear();
      }
    }
  },
  request: async ({ request }, provide, testInfo) => {
    const entries: HarEntry[] = [];
    let captureError = false;
    let observedMethods = 0;
    let eligibleMessages = 0;
    let bodyUnavailable = 0;
    const bodyUnavailableClasses = emptyBodyUnavailableCounts();
    const textualUnknownMethods = new Map<string, number>();
    let failedMessages = 0;
    const observedRequest = new Proxy(request, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (
          typeof property === 'string' &&
          wrappedRequestMethods.has(property) &&
          typeof value === 'function'
        ) {
          return async (...args: unknown[]) => {
            observedMethods += 1;
            const options = (
              args[1] && typeof args[1] === 'object' ? args[1] : {}
            ) as RequestOptions;
            const requestBodyData = requestBody(options);
            const requestedUrl = new URL(
              String(args[0]),
              securityE2eData.baseURL
            );
            const requestHeaders = mergeHeaders(
              {},
              options.headers,
              requestBodyData,
              await cookieHeader(target, requestedUrl)
            );
            const method =
              property === 'fetch'
                ? String(options.method ?? 'GET').toUpperCase()
                : property.toUpperCase();
            const startedDateTime = new Date().toISOString();
            let response: APIResponse;
            try {
              response = (await Reflect.apply(
                value,
                target,
                args
              )) as APIResponse;
            } catch (error) {
              if (isAllowedOrigin(requestedUrl.href)) {
                eligibleMessages += 1;
                failedMessages += 1;
                captureError = true;
              }
              throw error;
            }
            if (isAllowedOrigin(requestedUrl.href)) {
              eligibleMessages += 1;
              if (
                !isAllowedOrigin(response.url()) ||
                response.url() !== requestedUrl.href
              ) {
                captureError = true;
                failedMessages += 1;
                return response;
              }
              try {
                const captured = await toApiHarEntry(
                  response,
                  method,
                  requestedUrl.href,
                  requestHeaders,
                  requestBodyData,
                  startedDateTime
                );
                entries.push(captured.entry);
                if (captured.bodyUnavailable) bodyUnavailable += 1;
                if (captured.bodyUnavailableReason) {
                  bodyUnavailableClasses[captured.bodyUnavailableReason] += 1;
                }
                if (captured.bodyFailure) {
                  const key = captured.bodyFailureMethodStatus ?? 'OTHER:0';
                  textualUnknownMethods.set(
                    key,
                    (textualUnknownMethods.get(key) ?? 0) + 1
                  );
                }
              } catch {
                captureError = true;
                failedMessages += 1;
              }
            }
            return response;
          };
        }
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as APIRequestContext;

    try {
      await provide(observedRequest);
    } finally {
      await writeCapture(
        'api-request-context',
        testInfo,
        entries,
        captureError,
        eligibleMessages,
        bodyUnavailable,
        failedMessages
      );
      console.info(
        `[security-zap-capture] source=api_request_context test_title=${JSON.stringify(testInfo.title)} observed_methods=${observedMethods} eligible=${eligibleMessages} captured=${entries.length} cache_skipped=0 body_unavailable=${bodyUnavailable} body_unavailable_cache_skipped=0 body_unavailable_total=${bodyUnavailable} body_classes=${JSON.stringify(bodyUnavailableClasses)} request_timing_missing=0 textual_unknown_methods=${JSON.stringify(Object.fromEntries(textualUnknownMethods))} failed_messages=${failedMessages} complete=${!captureError}`
      );
    }
  },
});

export { expect } from '@playwright/test';
