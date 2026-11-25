import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  CDP_RESPONSE_BUFFER_OPTIONS,
  MAX_CDP_TIMING_TOLERANCE_MS,
  classifyUnavailableBody,
  classifyCdpExtraInfo304,
  classifyCdpWire304,
  classifyCdpCacheSource,
  canSkipBodylessCacheResponse,
  createCdpExtraInfoTracker,
  createCdpActivitySignal,
  countPendingCdpExtraInfo,
  recordCdpExtraInfo,
  recordCdpResponseStatus,
  correlateCdpCacheSources,
  correlateCdpCacheSourcesByTime,
  drainCdpCaptureEvents,
  extractSettledCaptureResults,
  summarizeCdpResourceTypes,
  decodeBoundedResponseBody,
  isCaptureWithinLimits,
  isUnavailableBodyFatal,
  readPageResourceBody,
  readDownloadBytes,
  reconcileFinishedBrowserRequest,
  setCdpExtraInfoExpectation,
  startCdpExtraInfoHop,
  summarizeCdpExtraInfo,
  summarizeBodylessCacheCandidateDiagnostics,
  summarizeBodylessCacheCandidateExtraInfo,
  projectBodylessCacheCandidateSidecar,
  normalizeHarStartedDateTimesByRequestTiming,
} from './security-passive-capture-policy.ts';

const allowedOrigin = 'https://localhost:18444';

function frameTree() {
  return {
    frame: { id: 'main-frame', url: `${allowedOrigin}/login` },
    resources: [{ url: `${allowedOrigin}/assets/main.js` }],
    childFrames: [
      {
        frame: { id: 'profile-frame', url: `${allowedOrigin}/profile` },
        resources: [{ url: `${allowedOrigin}/assets/profile-image.png` }],
      },
    ],
  };
}

test('associates page-resource fallback with the exact frame and URL', async () => {
  const calls: Array<{ frameId: string; url: string }> = [];
  const capture = await readPageResourceBody(
    {
      getResourceTree: async () => frameTree(),
      getResourceContent: async (frameId, url) => {
        calls.push({ frameId, url });
        return { content: 'AQID', base64Encoded: true };
      },
    },
    {
      frameId: 'profile-frame',
      url: `${allowedOrigin}/assets/profile-image.png`,
      allowedOrigin,
      capturedBytes: 0,
    }
  );

  assert.equal(capture.body?.toString('hex'), '010203');
  assert.deepEqual(calls, [
    {
      frameId: 'profile-frame',
      url: `${allowedOrigin}/assets/profile-image.png`,
    },
  ]);
});

test('rejects a same-origin resource unless the exact frame lists it', async () => {
  let contentReads = 0;
  const capture = await readPageResourceBody(
    {
      getResourceTree: async () => frameTree(),
      getResourceContent: async () => {
        contentReads += 1;
        return { content: 'AQID', base64Encoded: true };
      },
    },
    {
      frameId: 'main-frame',
      url: `${allowedOrigin}/assets/profile-image.png`,
      allowedOrigin,
      capturedBytes: 0,
    }
  );

  assert.equal(capture.body, undefined);
  assert.equal(capture.errorClass, 'protocol_unavailable');
  assert.equal(contentReads, 0);
});

test('rejects page-resource fallback outside the exact local origin', async () => {
  let treeReads = 0;
  let contentReads = 0;
  const capture = await readPageResourceBody(
    {
      getResourceTree: async () => {
        treeReads += 1;
        return frameTree();
      },
      getResourceContent: async () => {
        contentReads += 1;
        return { content: 'AQID', base64Encoded: true };
      },
    },
    {
      frameId: 'main-frame',
      url: 'https://localhost:18445/assets/main.js',
      allowedOrigin,
      capturedBytes: 0,
    }
  );

  assert.equal(capture.body, undefined);
  assert.equal(capture.errorClass, 'protocol_unavailable');
  assert.equal(treeReads, 0);
  assert.equal(contentReads, 0);
});

test('enforces per-resource and total limits on page-resource fallback', async () => {
  const matchingTree = {
    frame: { id: 'main-frame', url: `${allowedOrigin}/login` },
    resources: [{ url: `${allowedOrigin}/assets/large.bin` }],
  };
  const oversizedResource = await readPageResourceBody(
    {
      getResourceTree: async () => matchingTree,
      getResourceContent: async () => ({
        content: 'QUJDREVGRw==',
        base64Encoded: true,
      }),
    },
    {
      frameId: 'main-frame',
      url: `${allowedOrigin}/assets/large.bin`,
      allowedOrigin,
      capturedBytes: 0,
      maxBodyBytes: 4,
      maxTotalBytes: 8,
    }
  );
  const overTotalLimit = await readPageResourceBody(
    {
      getResourceTree: async () => matchingTree,
      getResourceContent: async () => ({
        content: 'AQID',
        base64Encoded: true,
      }),
    },
    {
      frameId: 'main-frame',
      url: `${allowedOrigin}/assets/large.bin`,
      allowedOrigin,
      capturedBytes: 7,
      maxBodyBytes: 4,
      maxTotalBytes: 8,
    }
  );

  assert.equal(oversizedResource.body, undefined);
  assert.equal(oversizedResource.errorClass, 'size_limit');
  assert.equal(overTotalLimit.body, undefined);
  assert.equal(overTotalLimit.errorClass, 'size_limit');
});

test('configures CDP buffers to retain complete response bodies', () => {
  assert.deepEqual(CDP_RESPONSE_BUFFER_OPTIONS, {
    maxTotalBufferSize: 50 * 1024 * 1024,
    maxResourceBufferSize: 10 * 1024 * 1024,
  });
  assert.equal(Object.isFrozen(CDP_RESPONSE_BUFFER_OPTIONS), true);
});

test('classifies only explicit CDP cache sources without exposing request data', () => {
  assert.equal(classifyCdpCacheSource({ fromDiskCache: true }), 'disk_cache');
  assert.equal(
    classifyCdpCacheSource({ fromPrefetchCache: true }),
    'prefetch_cache'
  );
  assert.equal(
    classifyCdpCacheSource({ fromEarlyHints: true }),
    'early_hints_cache'
  );
  assert.equal(
    classifyCdpCacheSource({ fromServiceWorker: true }),
    'service_worker'
  );
  assert.equal(
    classifyCdpCacheSource({ servedFromCache: true }),
    'cache_unspecified'
  );
  assert.equal(classifyCdpCacheSource({}), 'network');
  assert.equal(
    classifyCdpCacheSource({ fromDiskCache: true, fromServiceWorker: true }),
    'ambiguous'
  );
});

test('correlates cache source only when request and response keys are unique', () => {
  assert.deepEqual(
    correlateCdpCacheSources(
      ['one-response', 'missing-response', 'duplicate-response'],
      [
        { correlationKey: 'one-response', source: 'disk_cache' },
        { correlationKey: 'duplicate-response', source: 'network' },
        { correlationKey: 'duplicate-response', source: 'disk_cache' },
      ]
    ),
    ['disk_cache', 'metadata_missing', 'ambiguous']
  );
});

test('matches timed cache observations one-to-one using unique calibration deltas', () => {
  const result = correlateCdpCacheSourcesByTime(
    [
      { correlationKey: 'cal-a', startTimeMs: 100 },
      { correlationKey: 'cal-b', startTimeMs: 200 },
      { correlationKey: 'cal-c', startTimeMs: 300 },
      { correlationKey: 'unique', startTimeMs: 1_000 },
    ],
    [
      { correlationKey: 'cal-a', wallTimeMs: 101, source: 'network' },
      { correlationKey: 'cal-b', wallTimeMs: 201, source: 'network' },
      { correlationKey: 'cal-c', wallTimeMs: 301, source: 'network' },
      { correlationKey: 'unique', wallTimeMs: 1_001, source: 'disk_cache' },
    ]
  );

  assert.deepEqual(result.deltaSummary, {
    calibrationPairs: 4,
    minimumDeltaMs: 1,
    medianDeltaMs: 1,
    maximumDeltaMs: 1,
    toleranceMs: 0,
  });
  assert.deepEqual(result.sources, [
    'network',
    'network',
    'network',
    'disk_cache',
  ]);
  assert.deepEqual(result.matchedObservationIndices, [0, 1, 2, 3]);
});

test('fails closed when calibration deltas exceed the measured tolerance ceiling', () => {
  assert.equal(MAX_CDP_TIMING_TOLERANCE_MS, 100);
  const result = correlateCdpCacheSourcesByTime(
    [
      { correlationKey: 'cal-a', startTimeMs: 100 },
      { correlationKey: 'cal-b', startTimeMs: 200 },
      { correlationKey: 'cal-outlier', startTimeMs: 300 },
      { correlationKey: 'target', startTimeMs: 1_000 },
    ],
    [
      { correlationKey: 'cal-a', wallTimeMs: 100, source: 'network' },
      { correlationKey: 'cal-b', wallTimeMs: 200, source: 'network' },
      {
        correlationKey: 'cal-outlier',
        wallTimeMs: 400.001,
        source: 'network',
      },
      { correlationKey: 'target', wallTimeMs: 1_000, source: 'disk_cache' },
    ]
  );

  assert.equal(result.deltaSummary.calibrationPairs, 4);
  assert.equal(result.deltaSummary.toleranceMs, undefined);
  assert.equal(result.sources.at(-1), 'ambiguous');
});

test('keeps close repeated requests ambiguous within the calibrated tolerance', () => {
  const result = correlateCdpCacheSourcesByTime(
    [
      { correlationKey: 'cal-a', startTimeMs: 100 },
      { correlationKey: 'cal-b', startTimeMs: 200 },
      { correlationKey: 'cal-c', startTimeMs: 300 },
      { correlationKey: 'repeat', startTimeMs: 1_000 },
      { correlationKey: 'repeat', startTimeMs: 1_005 },
    ],
    [
      { correlationKey: 'cal-a', wallTimeMs: 100, source: 'network' },
      { correlationKey: 'cal-b', wallTimeMs: 200, source: 'network' },
      {
        correlationKey: 'cal-c',
        wallTimeMs: 400,
        source: 'network',
      },
      { correlationKey: 'repeat', wallTimeMs: 1_000, source: 'network' },
      { correlationKey: 'repeat', wallTimeMs: 1_005, source: 'disk_cache' },
    ]
  );

  assert.equal(result.deltaSummary.toleranceMs, MAX_CDP_TIMING_TOLERANCE_MS);
  assert.deepEqual(result.sources.slice(-2), ['ambiguous', 'ambiguous']);
});

test('keeps colliding duplicate requests ambiguous under temporal matching', () => {
  const result = correlateCdpCacheSourcesByTime(
    [
      { correlationKey: 'cal-a', startTimeMs: 100 },
      { correlationKey: 'cal-b', startTimeMs: 200 },
      { correlationKey: 'cal-c', startTimeMs: 300 },
      { correlationKey: 'collision', startTimeMs: 1_000 },
      { correlationKey: 'collision', startTimeMs: 1_000 },
    ],
    [
      { correlationKey: 'cal-a', wallTimeMs: 101, source: 'network' },
      { correlationKey: 'cal-b', wallTimeMs: 201, source: 'network' },
      { correlationKey: 'cal-c', wallTimeMs: 301, source: 'network' },
      { correlationKey: 'collision', wallTimeMs: 1_001, source: 'network' },
      { correlationKey: 'collision', wallTimeMs: 1_001, source: 'disk_cache' },
    ]
  );

  assert.deepEqual(result.sources, [
    'network',
    'network',
    'network',
    'ambiguous',
    'ambiguous',
  ]);
});

test('keeps equidistant temporal candidates ambiguous', () => {
  const result = correlateCdpCacheSourcesByTime(
    [
      { correlationKey: 'cal-a', startTimeMs: 100 },
      { correlationKey: 'cal-b', startTimeMs: 200 },
      { correlationKey: 'cal-c', startTimeMs: 300 },
      { correlationKey: 'tie', startTimeMs: 1_000 },
    ],
    [
      { correlationKey: 'cal-a', wallTimeMs: 100, source: 'network' },
      { correlationKey: 'cal-b', wallTimeMs: 201, source: 'network' },
      { correlationKey: 'cal-c', wallTimeMs: 302, source: 'network' },
      { correlationKey: 'tie', wallTimeMs: 1_000, source: 'network' },
      { correlationKey: 'tie', wallTimeMs: 1_002, source: 'disk_cache' },
    ]
  );

  assert.deepEqual(result.deltaSummary, {
    calibrationPairs: 3,
    minimumDeltaMs: 0,
    medianDeltaMs: 1,
    maximumDeltaMs: 2,
    toleranceMs: 1,
  });
  assert.equal(result.sources.at(-1), 'ambiguous');
});

test('keeps missing timestamps, redirects and missing CDP observations distinct', () => {
  const result = correlateCdpCacheSourcesByTime(
    [
      { correlationKey: 'cal-a', startTimeMs: 100 },
      { correlationKey: 'cal-b', startTimeMs: 200 },
      { correlationKey: 'cal-c', startTimeMs: 300 },
      { correlationKey: 'no-time' },
      { correlationKey: 'invalid-time', startTimeMs: -1 },
      { correlationKey: 'redirect', startTimeMs: 1_000, redirected: true },
      { correlationKey: 'missing' },
    ],
    [
      { correlationKey: 'cal-a', wallTimeMs: 101, source: 'network' },
      { correlationKey: 'cal-b', wallTimeMs: 201, source: 'network' },
      { correlationKey: 'cal-c', wallTimeMs: 301, source: 'network' },
      { correlationKey: 'no-time', wallTimeMs: 1_001, source: 'disk_cache' },
      {
        correlationKey: 'invalid-time',
        wallTimeMs: 1_001,
        source: 'disk_cache',
      },
      {
        correlationKey: 'redirect',
        wallTimeMs: 1_001,
        source: 'disk_cache',
        redirected: true,
      },
    ]
  );

  assert.deepEqual(result.sources.slice(-4), [
    'ambiguous',
    'ambiguous',
    'ambiguous',
    'metadata_missing',
  ]);
});

test('waits for outstanding Fetch continuations before the quiet window', async () => {
  const activity = createCdpActivitySignal();
  let pendingContinuations = 1;
  const drain = drainCdpCaptureEvents(
    () => ({
      inFlightRequests: 0,
      pendingOperations: 0,
      pendingContinuations,
      pendingExtraInfo: 0,
      reliable: true,
    }),
    activity,
    { quietWindowMs: 1, maxWaitMs: 100 }
  );
  let drainFinished = false;
  void drain.then(() => {
    drainFinished = true;
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(drainFinished, false);
  pendingContinuations = 0;
  activity.notify();
  assert.equal(await drain, true);
});

test('fails closed when a Fetch continuation exceeds the bounded drain', async () => {
  const activity = createCdpActivitySignal();
  const drainComplete = await drainCdpCaptureEvents(
    () => ({
      inFlightRequests: 0,
      pendingOperations: 0,
      pendingContinuations: 1,
      pendingExtraInfo: 0,
      reliable: true,
    }),
    activity,
    { quietWindowMs: 1, maxWaitMs: 5 }
  );

  assert.equal(drainComplete, false);
  assert.equal(
    canSkipBodylessCacheResponse({
      bodyUnavailable: true,
      bodyUnavailableReason: 'binary_media',
      source: 'cache_unspecified',
      responseStatus: 200,
      temporalMatchUnique: true,
      cacheEvidenceReliable: drainComplete,
      wire304Responses: 0,
      wire304Ambiguous: 0,
    }),
    false
  );
});

test('restarts the bounded quiet window after CDP activity', async () => {
  const activity = createCdpActivitySignal();
  const started = performance.now();
  const notification = setTimeout(() => activity.notify(), 5);
  const drainComplete = await drainCdpCaptureEvents(
    () => ({
      inFlightRequests: 0,
      pendingOperations: 0,
      pendingContinuations: 0,
      pendingExtraInfo: 0,
      reliable: true,
    }),
    activity,
    { quietWindowMs: 15, maxWaitMs: 100 }
  );
  clearTimeout(notification);

  assert.equal(drainComplete, true);
  assert.ok(performance.now() - started >= 15);
});

test('waits for same-origin requests that start and finish during the drain', async () => {
  const activity = createCdpActivitySignal();
  let inFlightRequests = 1;
  const drain = drainCdpCaptureEvents(
    () => ({
      inFlightRequests,
      pendingOperations: 0,
      pendingContinuations: 0,
      pendingExtraInfo: 0,
      reliable: true,
    }),
    activity,
    { quietWindowMs: 10, maxWaitMs: 100 }
  );

  const startRequest = setTimeout(() => {
    inFlightRequests = 2;
    activity.notify();
    setTimeout(() => {
      inFlightRequests = 1;
      activity.notify();
      setTimeout(() => {
        inFlightRequests = 0;
        activity.notify();
      }, 5);
    }, 5);
  }, 5);

  assert.equal(await drain, true);
  clearTimeout(startRequest);
});

test('waits for capture operations created during the drain', async () => {
  const activity = createCdpActivitySignal();
  let pendingOperations = 0;
  const drain = drainCdpCaptureEvents(
    () => ({
      inFlightRequests: 0,
      pendingOperations,
      pendingContinuations: 0,
      pendingExtraInfo: 0,
      reliable: true,
    }),
    activity,
    { quietWindowMs: 10, maxWaitMs: 100 }
  );

  const startOperation = setTimeout(() => {
    pendingOperations = 1;
    activity.notify();
    setTimeout(() => {
      pendingOperations = 0;
      activity.notify();
    }, 10);
  }, 5);

  assert.equal(await drain, true);
  clearTimeout(startOperation);
});

test('fails closed when same-origin requests remain in flight at the deadline', async () => {
  const activity = createCdpActivitySignal();
  const drainComplete = await drainCdpCaptureEvents(
    () => ({
      inFlightRequests: 1,
      pendingOperations: 0,
      pendingContinuations: 0,
      pendingExtraInfo: 0,
      reliable: true,
    }),
    activity,
    { quietWindowMs: 1, maxWaitMs: 5 }
  );

  assert.equal(drainComplete, false);
});

test('waits for late ExtraInfo after response expectations become pending', async () => {
  const activity = createCdpActivitySignal();
  const started = performance.now();
  let pendingExtraInfo = 1;
  const lateExtraInfo = setTimeout(() => {
    pendingExtraInfo = 0;
    activity.notify();
  }, 15);
  const drain = drainCdpCaptureEvents(
    () => ({
      inFlightRequests: 0,
      pendingOperations: 0,
      pendingContinuations: 0,
      pendingExtraInfo,
      reliable: true,
    }),
    activity,
    { quietWindowMs: 10, maxWaitMs: 100 }
  );
  let completed = false;
  void drain.then(() => {
    completed = true;
  });

  await new Promise((resolve) => setTimeout(resolve, 2));
  assert.equal(completed, false);
  assert.equal(await drain, true);
  clearTimeout(lateExtraInfo);
  assert.ok(performance.now() - started >= 20);
});

test('fails closed when expected ExtraInfo remains pending at the deadline', async () => {
  const activity = createCdpActivitySignal();
  const drainComplete = await drainCdpCaptureEvents(
    () => ({
      inFlightRequests: 0,
      pendingOperations: 0,
      pendingContinuations: 0,
      pendingExtraInfo: 1,
      reliable: true,
    }),
    activity,
    { quietWindowMs: 1, maxWaitMs: 5 }
  );

  assert.equal(drainComplete, false);
});

test('allows the quiet drain to finish when proxy logs will reconcile ExtraInfo', async () => {
  const activity = createCdpActivitySignal();
  const drainComplete = await drainCdpCaptureEvents(
    () => ({
      inFlightRequests: 0,
      pendingOperations: 0,
      pendingContinuations: 0,
      pendingExtraInfo: 1,
      reliable: true,
    }),
    activity,
    { quietWindowMs: 1, maxWaitMs: 100, allowPendingExtraInfo: true }
  );

  assert.equal(drainComplete, true);
});

test('reconciles one uniquely matching browser-finished CDP request', () => {
  const inFlightRequests = new Map([
    [
      'font-request',
      {
        url: `${allowedOrigin}/assets/lab.woff2`,
        method: 'GET',
        resourceType: 'Font',
      },
    ],
    [
      'image-request',
      {
        url: `${allowedOrigin}/assets/logo.svg`,
        method: 'GET',
        resourceType: 'Image',
      },
    ],
  ]);

  assert.equal(
    reconcileFinishedBrowserRequest(inFlightRequests, {
      url: `${allowedOrigin}/assets/lab.woff2`,
      method: 'GET',
    }),
    true
  );
  assert.deepEqual([...inFlightRequests.keys()], ['image-request']);
});

test('keeps ambiguous duplicate CDP requests in flight until their own events finish', () => {
  const duplicateRequest = {
    url: `${allowedOrigin}/assets/lab.woff2`,
    method: 'GET',
    resourceType: 'Font',
  };
  const inFlightRequests = new Map([
    ['font-request-1', duplicateRequest],
    ['font-request-2', duplicateRequest],
  ]);

  assert.equal(
    reconcileFinishedBrowserRequest(inFlightRequests, {
      url: duplicateRequest.url,
      method: duplicateRequest.method,
    }),
    false
  );
  assert.equal(inFlightRequests.size, 2);
});

test('aggregates in-flight requests by the fixed CDP resource type enum', () => {
  const summary = summarizeCdpResourceTypes([
    'Document',
    'Image',
    'Fetch',
    'Image',
    'private-url-and-method',
    undefined,
  ]);

  assert.deepEqual(summary, {
    Document: 1,
    Image: 2,
    Fetch: 1,
    unknown: 2,
  });
  assert.doesNotMatch(JSON.stringify(summary), /private-url-and-method/i);
});

test('extracts settled captures without awaiting pending capture promises', () => {
  const readyCapture = { status: 200 };
  const settled = extractSettledCaptureResults([
    { settled: true, value: readyCapture },
    { settled: false, value: { status: 201 } },
    { settled: true },
  ]);

  assert.deepEqual(settled, [readyCapture]);
});

test('projects bodyless cache candidate ExtraInfo as counts only', () => {
  const tracker = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(tracker, 'private-id-received', true, false);
  setCdpExtraInfoExpectation(tracker, 'private-id-received', true);
  recordCdpExtraInfo(tracker, 'private-id-received', 200);
  startCdpExtraInfoHop(tracker, 'private-id-missing', true, false);
  setCdpExtraInfoExpectation(tracker, 'private-id-missing', true);
  startCdpExtraInfoHop(tracker, 'private-id-not-expected', true, false);
  setCdpExtraInfoExpectation(tracker, 'private-id-not-expected', false);
  startCdpExtraInfoHop(tracker, 'private-id-unresolved', true, false);
  startCdpExtraInfoHop(tracker, 'private-id-ambiguous', true, false);
  const ambiguousHop = tracker.hopsByRequestId.get('private-id-ambiguous')![0];
  ambiguousHop.contradictory = true;
  const receivedHop = tracker.hopsByRequestId.get('private-id-received')![0];
  const missingHop = tracker.hopsByRequestId.get('private-id-missing')![0];
  const notExpectedHop = tracker.hopsByRequestId.get(
    'private-id-not-expected'
  )![0];
  const unresolvedHop = tracker.hopsByRequestId.get(
    'private-id-unresolved'
  )![0];

  const candidateWithSensitiveMetadata = {
    bodyUnavailable: true,
    source: 'cache_unspecified' as const,
    temporalMatchUnique: true,
    hop: receivedHop,
    requestId: 'private-cdp-request-id',
    url: 'https://private.invalid/path',
  };
  const summary = summarizeBodylessCacheCandidateExtraInfo([
    candidateWithSensitiveMetadata,
    {
      bodyUnavailable: true,
      source: 'cache_unspecified',
      temporalMatchUnique: true,
      hop: missingHop,
    },
    {
      bodyUnavailable: true,
      source: 'cache_unspecified',
      temporalMatchUnique: true,
      hop: notExpectedHop,
    },
    {
      bodyUnavailable: true,
      source: 'cache_unspecified',
      temporalMatchUnique: true,
      hop: unresolvedHop,
    },
    {
      bodyUnavailable: true,
      source: 'cache_unspecified',
      temporalMatchUnique: false,
      hop: ambiguousHop,
    },
    {
      bodyUnavailable: true,
      source: 'network',
      temporalMatchUnique: true,
      hop: receivedHop,
    },
  ]);

  assert.deepEqual(summary, {
    candidates: 5,
    expected: 2,
    received: 1,
    missing: 1,
    not_expected: 1,
    unresolved: 1,
    ambiguous: 1,
  });
  assert.doesNotMatch(
    JSON.stringify(summary),
    /private-cdp-request-id|private\.invalid|requestId|url/i
  );
});

test('summarizes bodyless cache candidate evidence using aggregate classes only', () => {
  const summary = summarizeBodylessCacheCandidateDiagnostics([
    {
      cacheEventObserved: true,
      hasExtraInfo: true,
      responseExtraInfoStatus: 304,
      resourceType: 'Font',
      loadingFinished: true,
    },
    {
      cacheEventObserved: true,
      hasExtraInfo: undefined,
      responseExtraInfoStatus: 200,
      resourceType: 'Fetch',
      loadingFinished: false,
    },
    {
      cacheEventObserved: false,
      hasExtraInfo: false,
      responseExtraInfoStatus: undefined,
      resourceType: 'private-resource-type',
      loadingFinished: true,
    },
  ]);

  assert.deepEqual(summary, {
    candidates: 3,
    cacheEventObserved: { observed: 2, notObserved: 1 },
    hasExtraInfo: { expected: 1, notExpected: 1, unknown: 1 },
    responseExtraInfo: { status304: 1, otherStatus: 1, absent: 1 },
    resourceTypes: { Font: 1, Fetch: 1, unknown: 1 },
    loadingFinished: { finished: 2, unfinished: 1 },
  });
  assert.doesNotMatch(JSON.stringify(summary), /200|private-resource-type/);
});

test('summarizes an empty bodyless cache candidate set without raw fields', () => {
  assert.deepEqual(summarizeBodylessCacheCandidateDiagnostics([]), {
    candidates: 0,
    cacheEventObserved: { observed: 0, notObserved: 0 },
    hasExtraInfo: { expected: 0, notExpected: 0, unknown: 0 },
    responseExtraInfo: { status304: 0, otherStatus: 0, absent: 0 },
    resourceTypes: {},
    loadingFinished: { finished: 0, unfinished: 0 },
  });
});

test('projects all binary cache candidates into a private sidecar shape', () => {
  const wallTimeMs = Date.UTC(2026, 10, 24, 12, 34, 56, 789);
  const result = projectBodylessCacheCandidateSidecar(
    [
      {
        originalEntryIndex: 4,
        harEntryIndex: 2,
        method: 'GET',
        url: 'https://localhost:18443/assets/font.woff2?rev=synthetic',
        responseStatus: 200,
        wallTimeMs,
        cacheSource: 'cache_unspecified',
        bodyUnavailable: true,
        skipped: false,
        cacheEventObserved: true,
        hasExtraInfo: true,
        responseExtraInfoStatus: 304,
        resourceType: 'Font',
        loadingFinished: true,
      },
      {
        originalEntryIndex: 9,
        harEntryIndex: null,
        method: 'GET',
        url: 'https://localhost:18443/assets/image.png?case=omitted',
        responseStatus: 200,
        wallTimeMs: undefined,
        cacheSource: 'ambiguous',
        bodyUnavailable: true,
        skipped: true,
        cacheEventObserved: false,
        hasExtraInfo: undefined,
        responseExtraInfoStatus: undefined,
        resourceType: 'PrivateType',
        loadingFinished: false,
      },
    ],
    3
  );

  assert.deepEqual(result, [
    {
      original_entry_index: 4,
      har_entry_index: 2,
      method: 'GET',
      url: 'https://localhost:18443/assets/font.woff2?rev=synthetic',
      response_status: 200,
      started_at: '2026-11-24T12:34:56.789Z',
      cache_source: 'cache_unspecified',
      body_unavailable: true,
      skipped: false,
      cache_event_observed: true,
      has_extra_info: true,
      response_extra_info: 'status304',
      resource_type: 'Font',
      loading_finished: true,
    },
    {
      original_entry_index: 9,
      har_entry_index: null,
      method: 'GET',
      url: 'https://localhost:18443/assets/image.png?case=omitted',
      response_status: 200,
      started_at: null,
      cache_source: 'ambiguous',
      body_unavailable: true,
      skipped: true,
      cache_event_observed: false,
      has_extra_info: null,
      response_extra_info: 'absent',
      resource_type: 'unknown',
      loading_finished: false,
    },
  ]);
  assert.doesNotMatch(
    JSON.stringify(result),
    /"response_extra_info":304|"response_extra_info":200/
  );
});

test('normalizes HAR start times from direct request timing values', () => {
  const fallback = '2026-11-24T12:35:00.000Z';
  const wallTimeMs = Date.UTC(2026, 10, 24, 12, 34, 56, 789);
  assert.deepEqual(
    normalizeHarStartedDateTimesByRequestTiming([
      {
        fallbackStartedDateTime: fallback,
        requestStartTimeMs: wallTimeMs,
      },
      {
        fallbackStartedDateTime: fallback,
        requestStartTimeMs: undefined,
      },
      {
        fallbackStartedDateTime: fallback,
        requestStartTimeMs: Number.NaN,
      },
    ]),
    {
      startedDateTimes: ['2026-11-24T12:34:56.789Z', fallback, fallback],
      requestTimingMissing: 2,
    }
  );
});

test('normalizes every HAR entry without correlating CDP cache events', () => {
  const base = Date.UTC(2026, 10, 24, 12, 34, 56, 789);
  const result = normalizeHarStartedDateTimesByRequestTiming(
    [25, 125, 225, 1_025].map((offset) => ({
      fallbackStartedDateTime: '2026-11-24T12:35:00.000Z',
      requestStartTimeMs: base + offset,
    }))
  );

  assert.deepEqual(result, {
    startedDateTimes: [25, 125, 225, 1_025].map((offset) =>
      new Date(base + offset).toISOString()
    ),
    requestTimingMissing: 0,
  });
});

test('rejects invalid or duplicate entry indexes in the candidate sidecar', () => {
  const candidate = {
    originalEntryIndex: 1,
    harEntryIndex: 0,
    method: 'GET',
    url: 'https://localhost:18443/assets/image.png',
    responseStatus: 200,
    wallTimeMs: undefined,
    cacheSource: 'network' as const,
    bodyUnavailable: true,
    skipped: false,
    cacheEventObserved: false,
    hasExtraInfo: false,
    responseExtraInfoStatus: undefined,
    resourceType: 'Image',
    loadingFinished: true,
  };

  assert.throws(
    () => projectBodylessCacheCandidateSidecar([candidate, candidate], 1),
    /original_entry_index values must be unique/
  );
  assert.throws(
    () =>
      projectBodylessCacheCandidateSidecar(
        [{ ...candidate, skipped: true, harEntryIndex: 0 }],
        1
      ),
    /skipped entries must not have a HAR index/
  );
  assert.throws(
    () =>
      projectBodylessCacheCandidateSidecar(
        [{ ...candidate, harEntryIndex: null }],
        1
      ),
    /retained entries must have a HAR index/
  );
  assert.throws(
    () => projectBodylessCacheCandidateSidecar([candidate], 0),
    /HAR index must point inside the retained HAR/
  );
});

test('counts wire 304 only for a same-origin non-redirect request', () => {
  assert.equal(classifyCdpWire304(304, true, false), 'wire_304');
  assert.equal(classifyCdpWire304(304, true, true), 'ambiguous');
  assert.equal(classifyCdpWire304(304, false, false), 'out_of_scope');
  assert.equal(classifyCdpWire304(200, true, false), 'not_304');
});

test('accounts for response extra info arriving before its expectation', () => {
  const tracker = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(tracker, 'local-hop', true, false);

  const observation = recordCdpExtraInfo(tracker, 'local-hop', 200);
  setCdpExtraInfoExpectation(tracker, 'local-hop', true);

  assert.deepEqual(observation, {
    inScope: true,
    redirected: false,
    ambiguous: false,
    known: true,
    countNetwork304: false,
  });
  assert.deepEqual(summarizeCdpExtraInfo(tracker), {
    expected: 1,
    received: 1,
    missing: 0,
    unexpected: 0,
    unexpectedExpectedFalse: 0,
    unmatched: 0,
    ambiguousEvents: 0,
    unresolved: 0,
    contradictory: 0,
    reliable: true,
  });
  assert.equal(
    tracker.hopsByRequestId.get('local-hop')?.[0].responseStatusCode,
    200
  );
});

test('stores response status only for a uniquely associated ExtraInfo hop', () => {
  const unique = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(unique, 'unique-hop', true, false);
  setCdpExtraInfoExpectation(unique, 'unique-hop', true);
  recordCdpExtraInfo(unique, 'unique-hop', 304);
  assert.equal(
    unique.hopsByRequestId.get('unique-hop')?.[0].responseStatusCode,
    304
  );

  const ambiguous = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(ambiguous, 'ambiguous-hop', true, false);
  setCdpExtraInfoExpectation(ambiguous, 'ambiguous-hop', true);
  startCdpExtraInfoHop(ambiguous, 'ambiguous-hop', true, true);
  setCdpExtraInfoExpectation(ambiguous, 'ambiguous-hop', true);
  const association = recordCdpExtraInfo(ambiguous, 'ambiguous-hop', 304);
  assert.equal(association.ambiguous, true);
  assert.equal(
    ambiguous.hopsByRequestId
      .get('ambiguous-hop')
      ?.every((hop) => hop.responseStatusCode === undefined),
    true
  );

  const unmatched = createCdpExtraInfoTracker();
  recordCdpExtraInfo(unmatched, 'unknown-hop', 304);
  assert.equal(unmatched.hopsByRequestId.size, 0);
});

test('marks ExtraInfo received before a false expectation as contradictory', () => {
  const tracker = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(tracker, 'private-request', true, false);
  recordCdpExtraInfo(tracker, 'private-request', 200);
  setCdpExtraInfoExpectation(tracker, 'private-request', false);

  const summary = summarizeCdpExtraInfo(tracker);
  assert.equal(summary.received, 1);
  assert.equal(summary.unexpectedExpectedFalse, 1);
  assert.equal(summary.contradictory, 1);
  assert.equal(summary.reliable, false);
});

test('fails closed when a response requiring extra info has no matching event', () => {
  const tracker = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(tracker, 'missing-extra', true, false);
  setCdpExtraInfoExpectation(tracker, 'missing-extra', true);

  const summary = summarizeCdpExtraInfo(tracker);
  assert.equal(summary.expected, 1);
  assert.equal(summary.missing, 1);
  assert.equal(summary.reliable, false);
});

test('counts missing and unresolved same-origin ExtraInfo expectations as pending', () => {
  const tracker = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(tracker, 'missing-extra', true, false);
  setCdpExtraInfoExpectation(tracker, 'missing-extra', true);
  startCdpExtraInfoHop(tracker, 'unresolved-extra', true, false);

  assert.equal(countPendingCdpExtraInfo(tracker), 2);
});

test('fails closed when extra info contradicts a false or repeated expectation', () => {
  const unexpected = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(unexpected, 'unexpected-extra', true, false);
  setCdpExtraInfoExpectation(unexpected, 'unexpected-extra', false);
  assert.equal(
    recordCdpExtraInfo(unexpected, 'unexpected-extra').ambiguous,
    true
  );
  const unexpectedSummary = summarizeCdpExtraInfo(unexpected);
  assert.equal(unexpectedSummary.unexpectedExpectedFalse, 1);
  assert.equal(unexpectedSummary.unmatched, 0);
  assert.equal(unexpectedSummary.reliable, false);

  const unmatched = createCdpExtraInfoTracker();
  recordCdpExtraInfo(unmatched, 'unassociated-extra', 200);
  const unmatchedSummary = summarizeCdpExtraInfo(unmatched);
  assert.equal(unmatchedSummary.unexpectedExpectedFalse, 0);
  assert.equal(unmatchedSummary.unmatched, 1);
  assert.equal(unmatchedSummary.reliable, false);

  const contradictory = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(contradictory, 'contradictory-extra', true, false);
  setCdpExtraInfoExpectation(contradictory, 'contradictory-extra', true);
  setCdpExtraInfoExpectation(contradictory, 'contradictory-extra', false);
  assert.equal(summarizeCdpExtraInfo(contradictory).contradictory, 1);
  assert.equal(summarizeCdpExtraInfo(contradictory).reliable, false);
});

test('tracks redirect response extra info per hop and keeps late 304 ambiguous', () => {
  const tracker = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(tracker, 'redirected-request', true, false);
  setCdpExtraInfoExpectation(tracker, 'redirected-request', true);
  startCdpExtraInfoHop(tracker, 'redirected-request', true, true);
  setCdpExtraInfoExpectation(tracker, 'redirected-request', false);

  const lateRedirectInfo = recordCdpExtraInfo(
    tracker,
    'redirected-request',
    200
  );
  assert.deepEqual(lateRedirectInfo, {
    inScope: true,
    redirected: true,
    ambiguous: false,
    known: true,
    countNetwork304: false,
  });
  assert.equal(
    classifyCdpWire304(
      304,
      lateRedirectInfo.inScope,
      lateRedirectInfo.redirected
    ),
    'ambiguous'
  );
  assert.equal(summarizeCdpExtraInfo(tracker).reliable, true);
});

test('marks a missing redirect-hop extra-info event as incomplete', () => {
  const tracker = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(tracker, 'redirect-hop', true, false);
  setCdpExtraInfoExpectation(tracker, 'redirect-hop', true);
  startCdpExtraInfoHop(tracker, 'redirect-hop', true, true);
  setCdpExtraInfoExpectation(tracker, 'redirect-hop', false);

  const summary = summarizeCdpExtraInfo(tracker);
  assert.equal(summary.missing, 1);
  assert.equal(summary.reliable, false);
});

test('counts a response 304 without an expected ExtraInfo event', () => {
  const tracker = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(tracker, 'response-304-no-extra', true, false);
  setCdpExtraInfoExpectation(tracker, 'response-304-no-extra', false);

  const response304 = recordCdpResponseStatus(
    tracker,
    'response-304-no-extra',
    304,
    true
  );
  assert.equal(response304.countNetwork304, true);
  assert.equal(
    canSkipBodylessCacheResponse({
      bodyUnavailable: true,
      bodyUnavailableReason: 'binary_media',
      source: 'cache_unspecified',
      responseStatus: 200,
      temporalMatchUnique: true,
      cacheEvidenceReliable: summarizeCdpExtraInfo(tracker).reliable,
      wire304Responses: response304.countNetwork304 ? 1 : 0,
      wire304Ambiguous: 0,
    }),
    false
  );
});

test('treats an unknown ExtraInfo 304 as ambiguous and blocks cache skips', () => {
  const tracker = createCdpExtraInfoTracker();
  const unknownExtraInfo = recordCdpExtraInfo(tracker, 'unknown-hop', 304);

  assert.deepEqual(unknownExtraInfo, {
    inScope: false,
    redirected: false,
    ambiguous: true,
    known: false,
    countNetwork304: true,
  });
  assert.equal(classifyCdpExtraInfo304(unknownExtraInfo), 'ambiguous');
  assert.equal(summarizeCdpExtraInfo(tracker).reliable, false);
  assert.equal(
    canSkipBodylessCacheResponse({
      bodyUnavailable: true,
      bodyUnavailableReason: 'binary_media',
      source: 'cache_unspecified',
      responseStatus: 200,
      temporalMatchUnique: true,
      cacheEvidenceReliable: summarizeCdpExtraInfo(tracker).reliable,
      wire304Responses: 0,
      wire304Ambiguous: 1,
    }),
    false
  );
});

test('deduplicates a 304 from response and ExtraInfo in either event order', () => {
  const before = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(before, 'extra-before-response', true, false);
  const earlyExtra = recordCdpExtraInfo(before, 'extra-before-response', 304);
  const lateResponse = recordCdpResponseStatus(
    before,
    'extra-before-response',
    304,
    true
  );
  setCdpExtraInfoExpectation(before, 'extra-before-response', true);

  assert.equal(earlyExtra.countNetwork304, true);
  assert.equal(lateResponse.countNetwork304, false);
  assert.deepEqual(summarizeCdpExtraInfo(before), {
    expected: 1,
    received: 1,
    missing: 0,
    unexpected: 0,
    unexpectedExpectedFalse: 0,
    unmatched: 0,
    ambiguousEvents: 0,
    unresolved: 0,
    contradictory: 0,
    reliable: true,
  });

  const after = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(after, 'extra-after-response', true, false);
  const earlyResponse = recordCdpResponseStatus(
    after,
    'extra-after-response',
    304,
    true
  );
  setCdpExtraInfoExpectation(after, 'extra-after-response', true);
  const lateExtra = recordCdpExtraInfo(after, 'extra-after-response', 304);

  assert.equal(earlyResponse.countNetwork304, true);
  assert.equal(lateExtra.countNetwork304, false);
  assert.deepEqual(summarizeCdpExtraInfo(after), {
    expected: 1,
    received: 1,
    missing: 0,
    unexpected: 0,
    unexpectedExpectedFalse: 0,
    unmatched: 0,
    ambiguousEvents: 0,
    unresolved: 0,
    contradictory: 0,
    reliable: true,
  });

  const cacheRevalidation = createCdpExtraInfoTracker();
  startCdpExtraInfoHop(cacheRevalidation, 'cached-revalidation', true, false);
  const cachedResponse = recordCdpResponseStatus(
    cacheRevalidation,
    'cached-revalidation',
    200,
    true
  );
  setCdpExtraInfoExpectation(cacheRevalidation, 'cached-revalidation', true);
  const wire304 = recordCdpExtraInfo(
    cacheRevalidation,
    'cached-revalidation',
    304
  );
  assert.equal(cachedResponse.countNetwork304, false);
  assert.equal(wire304.countNetwork304, true);
  assert.equal(summarizeCdpExtraInfo(cacheRevalidation).reliable, true);
});

test('skips only bodyless uniquely matched explicit cache responses without 304s', () => {
  const base = {
    bodyUnavailable: true,
    bodyUnavailableReason: 'binary_media' as const,
    temporalMatchUnique: true,
    responseStatus: 200,
    cacheEvidenceReliable: true,
    wire304Responses: 0,
    wire304Ambiguous: 0,
  };
  for (const source of [
    'cache_unspecified',
    'disk_cache',
    'prefetch_cache',
    'early_hints_cache',
  ] as const) {
    assert.equal(canSkipBodylessCacheResponse({ ...base, source }), true);
  }

  assert.equal(
    canSkipBodylessCacheResponse({
      ...base,
      source: 'cache_unspecified',
      temporalMatchUnique: false,
    }),
    false
  );
  assert.equal(
    canSkipBodylessCacheResponse({
      ...base,
      source: 'cache_unspecified',
      cacheEvidenceReliable: false,
    }),
    false
  );
  assert.equal(
    canSkipBodylessCacheResponse({
      ...base,
      source: 'cache_unspecified',
      wire304Responses: 1,
    }),
    false
  );
  assert.equal(
    canSkipBodylessCacheResponse({
      ...base,
      source: 'cache_unspecified',
      wire304Ambiguous: 1,
    }),
    false
  );
  assert.equal(
    canSkipBodylessCacheResponse({
      ...base,
      source: 'cache_unspecified',
      responseStatus: 304,
    }),
    false
  );
  for (const source of [
    'network',
    'service_worker',
    'metadata_missing',
    'ambiguous',
  ] as const) {
    assert.equal(canSkipBodylessCacheResponse({ ...base, source }), false);
  }
  assert.equal(
    canSkipBodylessCacheResponse({
      ...base,
      source: 'cache_unspecified',
      bodyUnavailable: false,
    }),
    false
  );
});

test('does not skip cacheable attachments or status-defined bodyless responses', () => {
  const base = {
    bodyUnavailable: true,
    source: 'cache_unspecified' as const,
    responseStatus: 200,
    temporalMatchUnique: true,
    cacheEvidenceReliable: true,
    wire304Responses: 0,
    wire304Ambiguous: 0,
  };

  for (const bodyUnavailableReason of [
    'attachment',
    'no_body_status',
  ] as const) {
    assert.equal(
      canSkipBodylessCacheResponse({ ...base, bodyUnavailableReason }),
      false
    );
  }
});

test('decodes bounded binary bodies returned by a paused CDP response', () => {
  const decoded = decodeBoundedResponseBody('AAEC//79', true, 0, 6, 10);
  assert.equal(decoded.body?.toString('hex'), '000102fffefd');

  const resourceLimit = decodeBoundedResponseBody('AAEC//79', true, 0, 5, 10);
  const aggregateLimit = decodeBoundedResponseBody('AAEC', true, 8, 10, 10);
  const malformedBody = decodeBoundedResponseBody(
    'not-base64',
    true,
    0,
    10,
    10
  );

  assert.equal(resourceLimit.body, undefined);
  assert.equal(resourceLimit.errorClass, 'size_limit');
  assert.equal(aggregateLimit.body, undefined);
  assert.equal(aggregateLimit.errorClass, 'size_limit');
  assert.equal(malformedBody.body, undefined);
  assert.equal(malformedBody.errorClass, 'protocol_unavailable');
});

test('classifies response statuses that cannot carry a body', () => {
  assert.equal(classifyUnavailableBody('HEAD', 200, []), 'no_body_status');
  assert.equal(classifyUnavailableBody('GET', 204, []), 'no_body_status');
  assert.equal(classifyUnavailableBody('GET', 304, []), 'no_body_status');
});

test('classifies an explicit zero-length response separately', () => {
  assert.equal(
    classifyUnavailableBody('GET', 200, [
      { name: 'Content-Length', value: '0' },
    ]),
    'zero_length'
  );
});

test('classifies explicit attachment downloads and inline content separately', () => {
  assert.equal(
    classifyUnavailableBody('GET', 200, [
      {
        name: 'Content-Disposition',
        value: 'attachment; filename="export.pdf"',
      },
    ]),
    'attachment'
  );
  assert.equal(
    classifyUnavailableBody('GET', 200, [
      { name: 'Content-Disposition', value: 'inline; filename="preview.pdf"' },
    ]),
    'textual_unknown'
  );
});

test('classifies binary media without exposing its content type', () => {
  assert.equal(
    classifyUnavailableBody(
      'GET',
      200,
      [{ name: 'Content-Type', value: 'image/png' }],
      'image'
    ),
    'binary_media'
  );
  assert.equal(isUnavailableBodyFatal('binary_media'), false);
});

test('classifies ordinary response bodies as textual unknowns', () => {
  assert.equal(
    classifyUnavailableBody('GET', 200, [
      { name: 'Content-Type', value: 'text/html' },
    ]),
    'textual_unknown'
  );
  assert.equal(isUnavailableBodyFatal('textual_unknown'), true);
  assert.equal(
    classifyUnavailableBody('POST', 200, [
      { name: 'Content-Type', value: 'application/json' },
    ]),
    'textual_unknown'
  );
});

test('reads download bytes in memory and enforces a bounded capture size', async () => {
  const bytes = await readDownloadBytes(
    Readable.from([Buffer.from('synthetic-'), Buffer.from('download')])
  );
  assert.equal(bytes.toString('utf8'), 'synthetic-download');
  await assert.rejects(
    readDownloadBytes(Readable.from([Buffer.alloc(5)]), 4),
    /download_capture_limit/
  );
});

test('bounds CDP body reads per response and across the in-memory capture', () => {
  const perResponseLimit = 10 * 1024 * 1024;
  const totalLimit = 50 * 1024 * 1024;
  assert.equal(
    isCaptureWithinLimits(perResponseLimit, 0, perResponseLimit, totalLimit),
    true
  );
  assert.equal(
    isCaptureWithinLimits(
      perResponseLimit + 1,
      0,
      perResponseLimit,
      totalLimit
    ),
    false
  );
  assert.equal(
    isCaptureWithinLimits(1, totalLimit, perResponseLimit, totalLimit),
    false
  );
});
