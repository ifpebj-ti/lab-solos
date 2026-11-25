import { performance } from 'node:perf_hooks';

export type CaptureHeader = { name: string; value: string };

export const CDP_RESPONSE_BUFFER_OPTIONS = Object.freeze({
  maxTotalBufferSize: 50 * 1024 * 1024,
  maxResourceBufferSize: 10 * 1024 * 1024,
});
export const MAX_CDP_TIMING_TOLERANCE_MS = 100;

export type CdpCacheSource =
  | 'network'
  | 'disk_cache'
  | 'prefetch_cache'
  | 'early_hints_cache'
  | 'service_worker'
  | 'cache_unspecified'
  | 'metadata_missing'
  | 'ambiguous';

export type ObservedCdpCacheSource = Exclude<
  CdpCacheSource,
  'metadata_missing' | 'ambiguous'
>;

export type CdpCacheResponseObservation = {
  correlationKey: string;
  source: CdpCacheSource;
};

export type TimedCdpCacheCapture = {
  correlationKey: string;
  startTimeMs?: number;
  redirected?: boolean;
};

export type TimedCdpCacheObservation = {
  correlationKey: string;
  wallTimeMs?: number;
  source: CdpCacheSource;
  redirected?: boolean;
};

export type CdpTimingDeltaSummary = {
  calibrationPairs: number;
  minimumDeltaMs?: number;
  medianDeltaMs?: number;
  maximumDeltaMs?: number;
  toleranceMs?: number;
};

export type TimedCdpCacheCorrelation = {
  deltaSummary: CdpTimingDeltaSummary;
  sources: CdpCacheSource[];
  matchedObservationIndices: Array<number | undefined>;
};

function isValidEpochTimestamp(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

type CorrelationEntry = { correlationKey: string };

function indexByCorrelationKey<T extends CorrelationEntry>(
  entries: readonly T[]
): Map<string, number[]> {
  const indexes = new Map<string, number[]>();
  entries.forEach((entry, index) => {
    const matchingIndexes = indexes.get(entry.correlationKey) ?? [];
    matchingIndexes.push(index);
    indexes.set(entry.correlationKey, matchingIndexes);
  });
  return indexes;
}

function getCalibrationDeltas(
  captures: readonly TimedCdpCacheCapture[],
  observations: readonly TimedCdpCacheObservation[],
  capturesByKey: ReadonlyMap<string, number[]>,
  observationsByKey: ReadonlyMap<string, number[]>
): number[] {
  const deltas: number[] = [];
  for (const [key, captureIndexes] of capturesByKey) {
    const observationIndexes = observationsByKey.get(key) ?? [];
    if (captureIndexes.length !== 1 || observationIndexes.length !== 1)
      continue;

    const capture = captures[captureIndexes[0]];
    const observation = observations[observationIndexes[0]];
    if (
      capture.redirected ||
      observation.redirected ||
      !isValidEpochTimestamp(capture.startTimeMs) ||
      !isValidEpochTimestamp(observation.wallTimeMs)
    ) {
      continue;
    }
    deltas.push(observation.wallTimeMs - capture.startTimeMs);
  }
  return deltas;
}

function medianOfSorted(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const midpoint = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? (values[midpoint - 1] + values[midpoint]) / 2
    : values[midpoint];
}

function createTimingSummary(calibrationDeltas: readonly number[]): {
  deltaSummary: CdpTimingDeltaSummary;
  medianDeltaMs?: number;
  toleranceMs?: number;
} {
  const sortedDeltas = [...calibrationDeltas].sort(
    (left, right) => left - right
  );
  const medianDeltaMs = medianOfSorted(sortedDeltas);
  const observedToleranceMs =
    calibrationDeltas.length >= 3 && medianDeltaMs !== undefined
      ? Math.max(
          ...calibrationDeltas.map((delta) => Math.abs(delta - medianDeltaMs))
        )
      : undefined;
  const toleranceMs =
    observedToleranceMs !== undefined &&
    observedToleranceMs <= MAX_CDP_TIMING_TOLERANCE_MS + 1e-9
      ? Math.min(observedToleranceMs, MAX_CDP_TIMING_TOLERANCE_MS)
      : undefined;

  return {
    deltaSummary: {
      calibrationPairs: calibrationDeltas.length,
      ...(sortedDeltas.length > 0
        ? {
            minimumDeltaMs: sortedDeltas[0],
            medianDeltaMs,
            maximumDeltaMs: sortedDeltas[sortedDeltas.length - 1],
          }
        : {}),
      ...(toleranceMs !== undefined ? { toleranceMs } : {}),
    },
    medianDeltaMs,
    toleranceMs,
  };
}

function hasValidCaptureGroup(
  captures: readonly TimedCdpCacheCapture[],
  captureIndexes: readonly number[]
): boolean {
  return captureIndexes.every((index) => {
    const capture = captures[index];
    return !capture.redirected && isValidEpochTimestamp(capture.startTimeMs);
  });
}

function hasValidObservationGroup(
  observations: readonly TimedCdpCacheObservation[],
  observationIndexes: readonly number[]
): boolean {
  return observationIndexes.every((index) => {
    const observation = observations[index];
    return (
      !observation.redirected && isValidEpochTimestamp(observation.wallTimeMs)
    );
  });
}

function addTimedCandidatePairs(
  captureIndexes: readonly number[],
  observationIndexes: readonly number[],
  captures: readonly TimedCdpCacheCapture[],
  observations: readonly TimedCdpCacheObservation[],
  medianDeltaMs: number,
  toleranceMs: number,
  candidateObservationsByCapture: number[][],
  candidateCaptureCounts: number[]
): void {
  for (const captureIndex of captureIndexes) {
    const startTimeMs = captures[captureIndex].startTimeMs;
    if (!isValidEpochTimestamp(startTimeMs)) continue;

    for (const observationIndex of observationIndexes) {
      const wallTimeMs = observations[observationIndex].wallTimeMs;
      if (!isValidEpochTimestamp(wallTimeMs)) continue;
      if (Math.abs(wallTimeMs - startTimeMs - medianDeltaMs) > toleranceMs) {
        continue;
      }

      candidateObservationsByCapture[captureIndex].push(observationIndex);
      candidateCaptureCounts[observationIndex] += 1;
    }
  }
}

function collectTimedCandidatePairs(
  captures: readonly TimedCdpCacheCapture[],
  observations: readonly TimedCdpCacheObservation[],
  capturesByKey: ReadonlyMap<string, number[]>,
  observationsByKey: ReadonlyMap<string, number[]>,
  medianDeltaMs: number | undefined,
  toleranceMs: number | undefined
): {
  candidateObservationsByCapture: number[][];
  candidateCaptureCounts: number[];
} {
  const candidateObservationsByCapture = captures.map((): number[] => []);
  const candidateCaptureCounts = observations.map(() => 0);
  if (medianDeltaMs === undefined || toleranceMs === undefined) {
    return { candidateObservationsByCapture, candidateCaptureCounts };
  }

  for (const [key, captureIndexes] of capturesByKey) {
    const observationIndexes = observationsByKey.get(key) ?? [];
    if (observationIndexes.length === 0) continue;
    if (!hasValidCaptureGroup(captures, captureIndexes)) continue;
    if (!hasValidObservationGroup(observations, observationIndexes)) continue;

    addTimedCandidatePairs(
      captureIndexes,
      observationIndexes,
      captures,
      observations,
      medianDeltaMs,
      toleranceMs,
      candidateObservationsByCapture,
      candidateCaptureCounts
    );
  }
  return { candidateObservationsByCapture, candidateCaptureCounts };
}

function classifyTimedCapture(
  capture: TimedCdpCacheCapture,
  captureIndex: number,
  observations: readonly TimedCdpCacheObservation[],
  observationsByKey: ReadonlyMap<string, number[]>,
  candidateObservationsByCapture: readonly number[][],
  candidateCaptureCounts: readonly number[],
  toleranceMs: number | undefined
): { source: CdpCacheSource; matchedObservationIndex?: number } {
  const observationIndexes =
    observationsByKey.get(capture.correlationKey) ?? [];
  if (observationIndexes.length === 0) return { source: 'metadata_missing' };
  if (
    capture.redirected ||
    !isValidEpochTimestamp(capture.startTimeMs) ||
    !hasValidObservationGroup(observations, observationIndexes) ||
    toleranceMs === undefined
  ) {
    return { source: 'ambiguous' };
  }

  const candidates = candidateObservationsByCapture[captureIndex];
  if (candidates.length !== 1 || candidateCaptureCounts[candidates[0]] !== 1) {
    return { source: 'ambiguous' };
  }
  return {
    source: observations[candidates[0]].source,
    matchedObservationIndex: candidates[0],
  };
}

export function correlateCdpCacheSourcesByTime(
  captures: TimedCdpCacheCapture[],
  observations: TimedCdpCacheObservation[]
): TimedCdpCacheCorrelation {
  const capturesByKey = indexByCorrelationKey(captures);
  const observationsByKey = indexByCorrelationKey(observations);
  const calibrationDeltas = getCalibrationDeltas(
    captures,
    observations,
    capturesByKey,
    observationsByKey
  );
  const timing = createTimingSummary(calibrationDeltas);
  const candidates = collectTimedCandidatePairs(
    captures,
    observations,
    capturesByKey,
    observationsByKey,
    timing.medianDeltaMs,
    timing.toleranceMs
  );
  const matchedObservationIndices: Array<number | undefined> = [];
  const sources = captures.map((capture, captureIndex) => {
    const classification = classifyTimedCapture(
      capture,
      captureIndex,
      observations,
      observationsByKey,
      candidates.candidateObservationsByCapture,
      candidates.candidateCaptureCounts,
      timing.toleranceMs
    );
    matchedObservationIndices[captureIndex] =
      classification.matchedObservationIndex;
    return classification.source;
  });

  return {
    deltaSummary: timing.deltaSummary,
    sources,
    matchedObservationIndices,
  };
}

export type CdpWire304Outcome =
  | 'wire_304'
  | 'ambiguous'
  | 'not_304'
  | 'out_of_scope';

export function classifyCdpWire304(
  statusCode: number,
  requestIsInScope: boolean,
  requestIsRedirected: boolean
): CdpWire304Outcome {
  if (statusCode !== 304) return 'not_304';
  if (!requestIsInScope) return 'out_of_scope';
  if (requestIsRedirected) return 'ambiguous';
  return 'wire_304';
}

export function classifyCdpExtraInfo304(
  association: CdpExtraInfoAssociation
): CdpWire304Outcome {
  if (!association.known || association.ambiguous) return 'ambiguous';
  return classifyCdpWire304(304, association.inScope, association.redirected);
}

export type CdpExtraInfoHop = {
  inScope: boolean;
  redirected: boolean;
  expected?: boolean;
  observed: boolean;
  responseStatusCode?: number;
  network304Counted: boolean;
  contradictory: boolean;
  unexpectedExpectedFalseCounted?: boolean;
};

export type CdpExtraInfoTracker = {
  hopsByRequestId: Map<string, CdpExtraInfoHop[]>;
  activeHopByRequestId: Map<string, CdpExtraInfoHop>;
  unmatchedExtraInfoEvents: number;
  unexpectedExpectedFalseExtraInfoEvents: number;
  ambiguousExtraInfoEvents: number;
};

export type CdpExtraInfoSummary = {
  expected: number;
  received: number;
  missing: number;
  unexpected: number;
  unexpectedExpectedFalse: number;
  unmatched: number;
  ambiguousEvents: number;
  unresolved: number;
  contradictory: number;
  reliable: boolean;
};

export type CdpExtraInfoAssociation = {
  inScope: boolean;
  redirected: boolean;
  ambiguous: boolean;
  known: boolean;
  countNetwork304: boolean;
};

export function createCdpExtraInfoTracker(): CdpExtraInfoTracker {
  return {
    hopsByRequestId: new Map(),
    activeHopByRequestId: new Map(),
    unmatchedExtraInfoEvents: 0,
    unexpectedExpectedFalseExtraInfoEvents: 0,
    ambiguousExtraInfoEvents: 0,
  };
}

export function startCdpExtraInfoHop(
  tracker: CdpExtraInfoTracker,
  requestId: string,
  inScope: boolean,
  redirected: boolean
): void {
  const hops = tracker.hopsByRequestId.get(requestId) ?? [];
  const previousHop = tracker.activeHopByRequestId.get(requestId);
  if (previousHop && redirected) previousHop.redirected = true;
  const hop: CdpExtraInfoHop = {
    inScope,
    redirected,
    observed: false,
    network304Counted: false,
    contradictory: false,
  };
  hops.push(hop);
  tracker.hopsByRequestId.set(requestId, hops);
  tracker.activeHopByRequestId.set(requestId, hop);
}

export function setCdpExtraInfoExpectation(
  tracker: CdpExtraInfoTracker,
  requestId: string,
  hasExtraInfo: boolean | undefined
): void {
  const hop = tracker.activeHopByRequestId.get(requestId);
  if (!hop) {
    tracker.unmatchedExtraInfoEvents += 1;
    return;
  }
  if (typeof hasExtraInfo !== 'boolean') {
    hop.contradictory = true;
    return;
  }
  if (
    hasExtraInfo === false &&
    hop.observed &&
    !hop.unexpectedExpectedFalseCounted
  ) {
    hop.contradictory = true;
    hop.unexpectedExpectedFalseCounted = true;
    tracker.unexpectedExpectedFalseExtraInfoEvents += 1;
  }
  if (hop.expected !== undefined && hop.expected !== hasExtraInfo) {
    hop.contradictory = true;
    return;
  }
  hop.expected = hasExtraInfo;
}

export function recordCdpExtraInfo(
  tracker: CdpExtraInfoTracker,
  requestId: string,
  statusCode?: number
): CdpExtraInfoAssociation {
  const hops = tracker.hopsByRequestId.get(requestId) ?? [];
  const candidates = hops.filter(
    (hop) => !hop.observed && hop.expected !== false
  );
  if (candidates.length === 1) {
    return associateUniqueExtraInfo(candidates[0], statusCode);
  }

  return associateAmbiguousExtraInfo(
    tracker,
    requestId,
    hops,
    candidates,
    statusCode
  );
}

function associateUniqueExtraInfo(
  hop: CdpExtraInfoHop,
  statusCode: number | undefined
): CdpExtraInfoAssociation {
  hop.observed = true;
  if (!hop.contradictory && statusCode !== undefined) {
    hop.responseStatusCode = statusCode;
  }
  const countNetwork304 = statusCode === 304 && !hop.network304Counted;
  if (statusCode === 304) hop.network304Counted = true;
  return {
    inScope: hop.inScope,
    redirected: hop.redirected,
    ambiguous: hop.contradictory,
    known: true,
    countNetwork304,
  };
}

function associateAmbiguousExtraInfo(
  tracker: CdpExtraInfoTracker,
  requestId: string,
  hops: readonly CdpExtraInfoHop[],
  candidates: readonly CdpExtraInfoHop[],
  statusCode: number | undefined
): CdpExtraInfoAssociation {
  const localCandidate = candidates.some((hop) => hop.inScope);
  const activeHop = tracker.activeHopByRequestId.get(requestId);
  const localActive = activeHop?.inScope === true;
  const known = hops.length > 0;
  const localRelated = localCandidate || localActive;
  const falseExpectationContradicted = activeHop?.expected === false;

  recordAmbiguousExtraInfoEvent(
    tracker,
    candidates,
    activeHop,
    falseExpectationContradicted,
    localRelated,
    known
  );
  candidates.forEach((candidate) => {
    candidate.contradictory = true;
  });
  if (falseExpectationContradicted && activeHop) {
    activeHop.contradictory = true;
  }
  if (candidates.length === 0 && localRelated && activeHop) {
    activeHop.contradictory = true;
  }
  const alreadyCounted =
    candidates.some((hop) => hop.network304Counted) ||
    activeHop?.network304Counted === true;
  if (statusCode === 304 && activeHop) activeHop.network304Counted = true;
  return {
    inScope: localRelated,
    redirected:
      candidates.some((hop) => hop.inScope && hop.redirected) ||
      (localActive && activeHop?.redirected === true),
    ambiguous: localRelated || !known,
    known,
    countNetwork304: statusCode === 304 && !alreadyCounted,
  };
}

function recordAmbiguousExtraInfoEvent(
  tracker: CdpExtraInfoTracker,
  candidates: readonly CdpExtraInfoHop[],
  activeHop: CdpExtraInfoHop | undefined,
  falseExpectationContradicted: boolean,
  localRelated: boolean,
  known: boolean
): void {
  if (candidates.length > 1) tracker.ambiguousExtraInfoEvents += 1;
  else if (falseExpectationContradicted && activeHop) {
    tracker.unexpectedExpectedFalseExtraInfoEvents += 1;
    activeHop.observed = true;
    activeHop.unexpectedExpectedFalseCounted = true;
  } else if (localRelated || !known) {
    tracker.unmatchedExtraInfoEvents += 1;
  }
}

export function recordCdpResponseStatus(
  tracker: CdpExtraInfoTracker,
  requestId: string,
  statusCode: number,
  responseIsInScope: boolean
): CdpExtraInfoAssociation {
  let hop = tracker.activeHopByRequestId.get(requestId);
  if (!hop) {
    hop = {
      inScope: responseIsInScope,
      redirected: false,
      expected: undefined,
      observed: false,
      network304Counted: statusCode === 304,
      contradictory: true,
    };
    tracker.hopsByRequestId.set(requestId, [hop]);
    tracker.activeHopByRequestId.set(requestId, hop);
    return {
      inScope: hop.inScope,
      redirected: false,
      ambiguous: true,
      known: false,
      countNetwork304: statusCode === 304,
    };
  }
  const countNetwork304 = statusCode === 304 && !hop.network304Counted;
  if (statusCode === 304) hop.network304Counted = true;
  return {
    inScope: hop.inScope,
    redirected: hop.redirected,
    ambiguous: hop.contradictory,
    known: true,
    countNetwork304,
  };
}

export function summarizeCdpExtraInfo(
  tracker: CdpExtraInfoTracker
): CdpExtraInfoSummary {
  const scopedHops = [...tracker.hopsByRequestId.values()]
    .flat()
    .filter((hop) => hop.inScope);
  const expected = scopedHops.filter((hop) => hop.expected === true).length;
  const received = scopedHops.filter((hop) => hop.observed).length;
  const missing = scopedHops.filter(
    (hop) => hop.expected === true && !hop.observed
  ).length;
  const unexpectedExpectedFalse =
    tracker.unexpectedExpectedFalseExtraInfoEvents;
  const unmatched = tracker.unmatchedExtraInfoEvents;
  const ambiguousEvents = tracker.ambiguousExtraInfoEvents;
  const unexpected = unexpectedExpectedFalse + unmatched;
  const unresolved = scopedHops.filter(
    (hop) => hop.expected === undefined
  ).length;
  const contradictory = scopedHops.filter((hop) => hop.contradictory).length;
  return {
    expected,
    received,
    missing,
    unexpected,
    unexpectedExpectedFalse,
    unmatched,
    ambiguousEvents,
    unresolved,
    contradictory,
    reliable:
      missing === 0 &&
      unexpected === 0 &&
      ambiguousEvents === 0 &&
      unresolved === 0 &&
      contradictory === 0,
  };
}

export function countPendingCdpExtraInfo(tracker: CdpExtraInfoTracker): number {
  const summary = summarizeCdpExtraInfo(tracker);
  return summary.missing + summary.unresolved;
}

export type CdpActivitySignal = {
  getVersion: () => number;
  notify: () => void;
  waitForChange: (version: number, timeoutMs: number) => Promise<void>;
};

export type CdpCaptureDrainSnapshot = {
  inFlightRequests: number;
  pendingOperations: number;
  pendingContinuations: number;
  pendingExtraInfo: number;
  reliable: boolean;
};

export type CdpCaptureDrainState = () => CdpCaptureDrainSnapshot;

export type CdpInFlightRequest = {
  url: string;
  method: string;
  resourceType?: string;
};

export function reconcileFinishedBrowserRequest(
  inFlightRequests: Map<string, CdpInFlightRequest>,
  finishedRequest: Pick<CdpInFlightRequest, 'url' | 'method'>
): boolean {
  const matchingRequestIds = [...inFlightRequests.entries()]
    .filter(
      ([, request]) =>
        request.url === finishedRequest.url &&
        request.method === finishedRequest.method
    )
    .map(([requestId]) => requestId);
  if (matchingRequestIds.length !== 1) return false;
  return inFlightRequests.delete(matchingRequestIds[0]);
}

export const CDP_RESOURCE_TYPES = [
  'Document',
  'Stylesheet',
  'Image',
  'Media',
  'Font',
  'Script',
  'TextTrack',
  'XHR',
  'Fetch',
  'Prefetch',
  'EventSource',
  'WebSocket',
  'Manifest',
  'SignedExchange',
  'Ping',
  'CSPViolationReport',
  'Preflight',
  'FedCM',
  'Other',
] as const;

export type CdpResourceType = (typeof CDP_RESOURCE_TYPES)[number] | 'unknown';

export function summarizeCdpResourceTypes(
  resourceTypes: readonly unknown[]
): Partial<Record<CdpResourceType, number>> {
  const allowedTypes = new Set<string>(CDP_RESOURCE_TYPES);
  const counts: Partial<Record<CdpResourceType, number>> = {};
  for (const resourceType of resourceTypes) {
    const key =
      typeof resourceType === 'string' && allowedTypes.has(resourceType)
        ? (resourceType as CdpResourceType)
        : 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export type BodylessCacheCandidateDiagnosticInput = {
  cacheEventObserved: boolean;
  hasExtraInfo: boolean | undefined;
  responseExtraInfoStatus: number | undefined;
  resourceType: string;
  loadingFinished: boolean;
};

export type BodylessCacheCandidateDiagnosticSummary = {
  candidates: number;
  cacheEventObserved: { observed: number; notObserved: number };
  hasExtraInfo: {
    expected: number;
    notExpected: number;
    unknown: number;
  };
  responseExtraInfo: {
    status304: number;
    otherStatus: number;
    absent: number;
  };
  resourceTypes: Partial<Record<CdpResourceType, number>>;
  loadingFinished: { finished: number; unfinished: number };
};

export function summarizeBodylessCacheCandidateDiagnostics(
  candidates: readonly BodylessCacheCandidateDiagnosticInput[]
): BodylessCacheCandidateDiagnosticSummary {
  const summary: BodylessCacheCandidateDiagnosticSummary = {
    candidates: candidates.length,
    cacheEventObserved: { observed: 0, notObserved: 0 },
    hasExtraInfo: { expected: 0, notExpected: 0, unknown: 0 },
    responseExtraInfo: { status304: 0, otherStatus: 0, absent: 0 },
    resourceTypes: summarizeCdpResourceTypes(
      candidates.map(({ resourceType }) => resourceType)
    ),
    loadingFinished: { finished: 0, unfinished: 0 },
  };

  for (const candidate of candidates) {
    if (candidate.cacheEventObserved) {
      summary.cacheEventObserved.observed += 1;
    } else {
      summary.cacheEventObserved.notObserved += 1;
    }

    if (candidate.hasExtraInfo === true) {
      summary.hasExtraInfo.expected += 1;
    } else if (candidate.hasExtraInfo === false) {
      summary.hasExtraInfo.notExpected += 1;
    } else {
      summary.hasExtraInfo.unknown += 1;
    }

    if (candidate.responseExtraInfoStatus === undefined) {
      summary.responseExtraInfo.absent += 1;
    } else if (candidate.responseExtraInfoStatus === 304) {
      summary.responseExtraInfo.status304 += 1;
    } else {
      summary.responseExtraInfo.otherStatus += 1;
    }

    if (candidate.loadingFinished) {
      summary.loadingFinished.finished += 1;
    } else {
      summary.loadingFinished.unfinished += 1;
    }
  }

  return summary;
}

export type BodylessCacheCandidateSidecarInput = {
  originalEntryIndex: number;
  harEntryIndex: number | null;
  method: string;
  url: string;
  responseStatus: number;
  wallTimeMs: number | undefined;
  cacheSource: CdpCacheSource;
  bodyUnavailable: boolean;
  skipped: boolean;
  cacheEventObserved: boolean;
  hasExtraInfo: boolean | undefined;
  responseExtraInfoStatus: number | undefined;
  resourceType: string;
  loadingFinished: boolean;
};

export type BodylessCacheCandidateSidecarEntry = {
  original_entry_index: number;
  har_entry_index: number | null;
  method: string;
  url: string;
  response_status: number;
  started_at: string | null;
  cache_source: CdpCacheSource;
  body_unavailable: boolean;
  skipped: boolean;
  cache_event_observed: boolean;
  has_extra_info: boolean | null;
  response_extra_info: 'status304' | 'otherStatus' | 'absent';
  resource_type: CdpResourceType;
  loading_finished: boolean;
};

function registerSidecarCandidateIndexes(
  candidate: BodylessCacheCandidateSidecarInput,
  retainedEntryCount: number,
  originalEntryIndexes: Set<number>,
  harEntryIndexes: Set<number>
): void {
  if (
    !Number.isSafeInteger(candidate.originalEntryIndex) ||
    candidate.originalEntryIndex < 0 ||
    originalEntryIndexes.has(candidate.originalEntryIndex)
  ) {
    throw new Error('candidate original_entry_index values must be unique');
  }
  originalEntryIndexes.add(candidate.originalEntryIndex);

  if (candidate.bodyUnavailable !== true) {
    throw new Error('sidecar candidates must have an unavailable body');
  }
  if (
    !Number.isSafeInteger(candidate.responseStatus) ||
    candidate.responseStatus < 100 ||
    candidate.responseStatus > 599 ||
    (candidate.skipped && candidate.responseStatus === 304)
  ) {
    throw new Error('sidecar response status is invalid');
  }
  if (candidate.skipped) {
    if (candidate.harEntryIndex !== null) {
      throw new Error('skipped entries must not have a HAR index');
    }
    return;
  }

  if (candidate.harEntryIndex === null) {
    throw new Error('retained entries must have a HAR index');
  }
  if (
    !Number.isSafeInteger(candidate.harEntryIndex) ||
    candidate.harEntryIndex < 0 ||
    candidate.harEntryIndex >= retainedEntryCount
  ) {
    throw new Error('HAR index must point inside the retained HAR');
  }
  if (harEntryIndexes.has(candidate.harEntryIndex)) {
    throw new Error('candidate HAR indexes must be unique');
  }
  harEntryIndexes.add(candidate.harEntryIndex);
}

function getSidecarStartedAt(wallTimeMs: number | undefined): string | null {
  if (
    typeof wallTimeMs !== 'number' ||
    !Number.isFinite(wallTimeMs) ||
    wallTimeMs <= 0
  ) {
    return null;
  }
  const date = new Date(wallTimeMs);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function getSidecarResourceType(resourceType: unknown): CdpResourceType {
  const counts = summarizeCdpResourceTypes([resourceType]);
  return (Object.keys(counts) as CdpResourceType[])[0] ?? 'unknown';
}

function getSidecarResponseExtraInfo(
  status: number | undefined
): BodylessCacheCandidateSidecarEntry['response_extra_info'] {
  if (status === undefined) return 'absent';
  return status === 304 ? 'status304' : 'otherStatus';
}

function projectSidecarCandidate(
  candidate: BodylessCacheCandidateSidecarInput
): BodylessCacheCandidateSidecarEntry {
  return {
    original_entry_index: candidate.originalEntryIndex,
    har_entry_index: candidate.skipped ? null : candidate.harEntryIndex,
    method: candidate.method,
    url: candidate.url,
    response_status: candidate.responseStatus,
    started_at: getSidecarStartedAt(candidate.wallTimeMs),
    cache_source: candidate.cacheSource,
    body_unavailable: candidate.bodyUnavailable,
    skipped: candidate.skipped,
    cache_event_observed: candidate.cacheEventObserved,
    has_extra_info: candidate.hasExtraInfo ?? null,
    response_extra_info: getSidecarResponseExtraInfo(
      candidate.responseExtraInfoStatus
    ),
    resource_type: getSidecarResourceType(candidate.resourceType),
    loading_finished: candidate.loadingFinished,
  };
}

export function projectBodylessCacheCandidateSidecar(
  candidates: readonly BodylessCacheCandidateSidecarInput[],
  retainedEntryCount: number
): BodylessCacheCandidateSidecarEntry[] {
  if (!Number.isSafeInteger(retainedEntryCount) || retainedEntryCount < 0) {
    throw new RangeError('retainedEntryCount must be a nonnegative integer');
  }

  const originalEntryIndexes = new Set<number>();
  const harEntryIndexes = new Set<number>();

  return candidates.map((candidate) => {
    registerSidecarCandidateIndexes(
      candidate,
      retainedEntryCount,
      originalEntryIndexes,
      harEntryIndexes
    );
    return projectSidecarCandidate(candidate);
  });
}

export type SettledCaptureResult<T> = {
  settled: boolean;
  value?: T;
};

export function extractSettledCaptureResults<T>(
  captures: readonly SettledCaptureResult<T>[]
): T[] {
  return captures.flatMap((capture) =>
    capture.settled && capture.value !== undefined ? [capture.value] : []
  );
}

export function createCdpActivitySignal(): CdpActivitySignal {
  let version = 0;
  const waiters = new Set<() => void>();

  return {
    getVersion: () => version,
    notify: () => {
      version += 1;
      for (const resolve of [...waiters]) resolve();
    },
    waitForChange: (observedVersion, timeoutMs) => {
      if (version !== observedVersion || timeoutMs <= 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const finish = () => {
          clearTimeout(timer);
          waiters.delete(finish);
          resolve();
        };
        const timer = setTimeout(finish, timeoutMs);
        waiters.add(finish);
      });
    },
  };
}

type CdpCaptureDrainOptions = {
  quietWindowMs?: number;
  maxWaitMs?: number;
  deadlineAtMs?: number;
  allowPendingExtraInfo?: boolean;
};

function resolveDrainTiming(
  options: CdpCaptureDrainOptions,
  now: () => number
): { quietWindowMs: number; deadline: number } | null {
  const quietWindowMs = options.quietWindowMs ?? 250;
  const maxWaitMs = options.maxWaitMs ?? 2_000;
  if (
    !Number.isFinite(quietWindowMs) ||
    quietWindowMs <= 0 ||
    !Number.isFinite(maxWaitMs) ||
    maxWaitMs < quietWindowMs
  ) {
    return null;
  }

  const deadline = options.deadlineAtMs ?? now() + maxWaitMs;
  return Number.isFinite(deadline) && deadline > now()
    ? { quietWindowMs, deadline }
    : null;
}

function hasValidCaptureDrainState(state: CdpCaptureDrainSnapshot): boolean {
  const counts = [
    state.inFlightRequests,
    state.pendingOperations,
    state.pendingContinuations,
    state.pendingExtraInfo,
  ];
  return (
    state.reliable &&
    counts.every((count) => Number.isSafeInteger(count) && count >= 0)
  );
}

function hasPendingCaptureWork(
  state: CdpCaptureDrainSnapshot,
  allowPendingExtraInfo: boolean
): boolean {
  return (
    state.inFlightRequests > 0 ||
    state.pendingOperations > 0 ||
    state.pendingContinuations > 0 ||
    (state.pendingExtraInfo > 0 && !allowPendingExtraInfo)
  );
}

export async function drainCdpCaptureEvents(
  getState: CdpCaptureDrainState,
  activity: CdpActivitySignal,
  options: CdpCaptureDrainOptions = {}
): Promise<boolean> {
  const now = () => performance.now();
  const timing = resolveDrainTiming(options, now);
  if (!timing) return false;

  let observedVersion = activity.getVersion();
  let quietSince = now();
  while (true) {
    const currentTime = now();
    if (currentTime >= timing.deadline) return false;
    const state = getState();
    if (!hasValidCaptureDrainState(state)) return false;
    if (hasPendingCaptureWork(state, options.allowPendingExtraInfo ?? false)) {
      quietSince = currentTime;
    } else if (currentTime - quietSince >= timing.quietWindowMs) {
      return true;
    }

    const quietRemaining = timing.quietWindowMs - (currentTime - quietSince);
    const timeRemaining = timing.deadline - currentTime;
    await activity.waitForChange(
      observedVersion,
      Math.min(Math.max(quietRemaining, 1), timeRemaining)
    );
    const nextVersion = activity.getVersion();
    if (nextVersion !== observedVersion) {
      observedVersion = nextVersion;
      quietSince = now();
    }
  }
}

export type BodylessCacheCandidateExtraInfoInput = {
  bodyUnavailable: boolean;
  source: CdpCacheSource;
  temporalMatchUnique: boolean;
  hop?: CdpExtraInfoHop;
};

export type BodylessCacheCandidateExtraInfoSummary = {
  candidates: number;
  expected: number;
  received: number;
  missing: number;
  not_expected: number;
  unresolved: number;
  ambiguous: number;
};

export function summarizeBodylessCacheCandidateExtraInfo(
  observations: readonly BodylessCacheCandidateExtraInfoInput[]
): BodylessCacheCandidateExtraInfoSummary {
  const summary: BodylessCacheCandidateExtraInfoSummary = {
    candidates: 0,
    expected: 0,
    received: 0,
    missing: 0,
    not_expected: 0,
    unresolved: 0,
    ambiguous: 0,
  };
  const explicitCacheSources = new Set<CdpCacheSource>([
    'cache_unspecified',
    'disk_cache',
    'prefetch_cache',
    'early_hints_cache',
  ]);

  for (const observation of observations) {
    if (!observation.bodyUnavailable) continue;
    const mayBeCacheCandidate =
      explicitCacheSources.has(observation.source) ||
      observation.source === 'metadata_missing' ||
      observation.source === 'ambiguous';
    if (!mayBeCacheCandidate) {
      continue;
    }
    summary.candidates += 1;
    const hop = observation.hop;
    if (
      observation.source === 'metadata_missing' ||
      observation.source === 'ambiguous' ||
      !observation.temporalMatchUnique ||
      !hop ||
      hop.contradictory
    ) {
      summary.ambiguous += 1;
    } else if (hop.expected === true) {
      summary.expected += 1;
      if (hop.observed) summary.received += 1;
      else summary.missing += 1;
    } else if (hop.expected === false) {
      summary.not_expected += 1;
    } else {
      summary.unresolved += 1;
    }
  }
  return summary;
}

export function canSkipBodylessCacheResponse(input: {
  bodyUnavailable: boolean;
  bodyUnavailableReason: BodyUnavailableReason | undefined;
  source: CdpCacheSource;
  responseStatus: number;
  temporalMatchUnique: boolean;
  cacheEvidenceReliable: boolean;
  wire304Responses: number;
  wire304Ambiguous: number;
}): boolean {
  const explicitCacheSource =
    input.source === 'cache_unspecified' ||
    input.source === 'disk_cache' ||
    input.source === 'prefetch_cache' ||
    input.source === 'early_hints_cache';
  const safe304Counts =
    Number.isSafeInteger(input.wire304Responses) &&
    input.wire304Responses === 0 &&
    Number.isSafeInteger(input.wire304Ambiguous) &&
    input.wire304Ambiguous === 0;
  const safeResponseStatus =
    Number.isSafeInteger(input.responseStatus) &&
    input.responseStatus >= 100 &&
    input.responseStatus <= 599 &&
    input.responseStatus !== 304;
  return (
    input.bodyUnavailable &&
    input.bodyUnavailableReason === 'binary_media' &&
    input.temporalMatchUnique &&
    input.cacheEvidenceReliable &&
    explicitCacheSource &&
    safeResponseStatus &&
    safe304Counts
  );
}

export type HarStartTimeNormalizationInput = {
  fallbackStartedDateTime: string;
  requestStartTimeMs: number | undefined;
};

export function normalizeHarStartedDateTimesByRequestTiming(
  entries: readonly HarStartTimeNormalizationInput[]
): { startedDateTimes: string[]; requestTimingMissing: number } {
  let requestTimingMissing = 0;
  const startedDateTimes = entries.map((entry) => {
    if (!isValidEpochTimestamp(entry.requestStartTimeMs)) {
      requestTimingMissing += 1;
      return entry.fallbackStartedDateTime;
    }

    const date = new Date(entry.requestStartTimeMs);
    if (!Number.isFinite(date.getTime())) {
      requestTimingMissing += 1;
      return entry.fallbackStartedDateTime;
    }
    return date.toISOString();
  });

  return { startedDateTimes, requestTimingMissing };
}

export type CdpCacheMetadata = {
  fromDiskCache?: boolean;
  fromServiceWorker?: boolean;
  fromPrefetchCache?: boolean;
  fromEarlyHints?: boolean;
  servedFromCache?: boolean;
};

export function classifyCdpCacheSource(
  metadata: CdpCacheMetadata
): CdpCacheSource {
  const sources: ObservedCdpCacheSource[] = [];
  if (metadata.fromServiceWorker) sources.push('service_worker');
  if (metadata.fromPrefetchCache) sources.push('prefetch_cache');
  if (metadata.fromEarlyHints) sources.push('early_hints_cache');
  if (metadata.fromDiskCache) sources.push('disk_cache');
  if (sources.length > 1) return 'ambiguous';
  if (sources.length === 1) return sources[0];
  if (metadata.servedFromCache) return 'cache_unspecified';
  return 'network';
}

export function correlateCdpCacheSources(
  captureKeys: string[],
  observations: CdpCacheResponseObservation[]
): CdpCacheSource[] {
  const captureCounts = new Map<string, number>();
  for (const key of captureKeys) {
    captureCounts.set(key, (captureCounts.get(key) ?? 0) + 1);
  }

  const sourcesByKey = new Map<string, CdpCacheSource[]>();
  for (const observation of observations) {
    const sources = sourcesByKey.get(observation.correlationKey) ?? [];
    sources.push(observation.source);
    sourcesByKey.set(observation.correlationKey, sources);
  }

  return captureKeys.map((key) => {
    const sources = sourcesByKey.get(key) ?? [];
    if (sources.length === 0) return 'metadata_missing';
    if (sources.length !== 1 || captureCounts.get(key) !== 1) {
      return 'ambiguous';
    }
    return sources[0];
  });
}

export type CdpFrameResourceTree = {
  frame: { id: string; url: string };
  resources: Array<{ url: string }>;
  childFrames?: CdpFrameResourceTree[];
};

export type CdpPageResourceContent = {
  content: string;
  base64Encoded: boolean;
};

export type CdpPageResourceCapture = {
  body?: Buffer;
  errorClass?: 'protocol_unavailable' | 'size_limit';
};

export type CdpPageResourceReader = {
  getResourceTree: () => Promise<CdpFrameResourceTree>;
  getResourceContent: (
    frameId: string,
    url: string
  ) => Promise<CdpPageResourceContent>;
};

export type CdpPageResourceOptions = {
  frameId: string;
  url: string;
  allowedOrigin: string;
  capturedBytes: number;
  maxBodyBytes?: number;
  maxTotalBytes?: number;
};

function hasOrigin(url: string, allowedOrigin: string): boolean {
  try {
    return new URL(url).origin === allowedOrigin;
  } catch {
    return false;
  }
}

function frameContainsResource(
  tree: CdpFrameResourceTree,
  frameId: string,
  url: string,
  allowedOrigin: string
): boolean {
  if (tree.frame.id === frameId) {
    return (
      hasOrigin(tree.frame.url, allowedOrigin) &&
      tree.resources.some(
        (resource) =>
          resource.url === url && hasOrigin(resource.url, allowedOrigin)
      )
    );
  }
  return (
    tree.childFrames?.some((child) =>
      frameContainsResource(child, frameId, url, allowedOrigin)
    ) ?? false
  );
}

function decodePageResource(
  content: string,
  base64Encoded: boolean,
  capturedBytes: number,
  maxBodyBytes: number,
  maxTotalBytes: number
): CdpPageResourceCapture {
  const availableBytes = Math.min(maxBodyBytes, maxTotalBytes - capturedBytes);
  if (availableBytes < 0) return { errorClass: 'size_limit' };

  let expectedBytes: number;
  if (base64Encoded) {
    const maxBase64Length = 4 * Math.ceil(availableBytes / 3);
    if (content.length > maxBase64Length) return { errorClass: 'size_limit' };
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        content
      )
    ) {
      return { errorClass: 'protocol_unavailable' };
    }
    const padding = content.endsWith('==') ? 2 : content.endsWith('=') ? 1 : 0;
    expectedBytes = (content.length / 4) * 3 - padding;
  } else {
    expectedBytes = Buffer.byteLength(content, 'utf8');
  }

  if (
    !isCaptureWithinLimits(
      expectedBytes,
      capturedBytes,
      maxBodyBytes,
      maxTotalBytes
    )
  ) {
    return { errorClass: 'size_limit' };
  }
  const body = Buffer.from(content, base64Encoded ? 'base64' : 'utf8');
  return body.length === expectedBytes
    ? { body }
    : { errorClass: 'protocol_unavailable' };
}

export function decodeBoundedResponseBody(
  content: string,
  base64Encoded: boolean,
  capturedBytes: number,
  maxBodyBytes = CDP_RESPONSE_BUFFER_OPTIONS.maxResourceBufferSize,
  maxTotalBytes = CDP_RESPONSE_BUFFER_OPTIONS.maxTotalBufferSize
): CdpPageResourceCapture {
  if (
    !Number.isSafeInteger(capturedBytes) ||
    capturedBytes < 0 ||
    !Number.isSafeInteger(maxBodyBytes) ||
    maxBodyBytes < 0 ||
    !Number.isSafeInteger(maxTotalBytes) ||
    maxTotalBytes < 0
  ) {
    return { errorClass: 'protocol_unavailable' };
  }
  return decodePageResource(
    content,
    base64Encoded,
    capturedBytes,
    maxBodyBytes,
    maxTotalBytes
  );
}

export async function readPageResourceBody(
  reader: CdpPageResourceReader,
  options: CdpPageResourceOptions
): Promise<CdpPageResourceCapture> {
  const maxBodyBytes =
    options.maxBodyBytes ?? CDP_RESPONSE_BUFFER_OPTIONS.maxResourceBufferSize;
  const maxTotalBytes =
    options.maxTotalBytes ?? CDP_RESPONSE_BUFFER_OPTIONS.maxTotalBufferSize;
  if (
    !hasOrigin(options.url, options.allowedOrigin) ||
    !Number.isSafeInteger(options.capturedBytes) ||
    options.capturedBytes < 0
  ) {
    return { errorClass: 'protocol_unavailable' };
  }

  try {
    const tree = await reader.getResourceTree();
    if (
      !frameContainsResource(
        tree,
        options.frameId,
        options.url,
        options.allowedOrigin
      )
    ) {
      return { errorClass: 'protocol_unavailable' };
    }
    const resource = await reader.getResourceContent(
      options.frameId,
      options.url
    );
    if (
      typeof resource.content !== 'string' ||
      typeof resource.base64Encoded !== 'boolean'
    ) {
      return { errorClass: 'protocol_unavailable' };
    }
    return decodePageResource(
      resource.content,
      resource.base64Encoded,
      options.capturedBytes,
      maxBodyBytes,
      maxTotalBytes
    );
  } catch {
    return { errorClass: 'protocol_unavailable' };
  }
}

export type BodyUnavailableReason =
  | 'no_body_status'
  | 'zero_length'
  | 'attachment'
  | 'binary_media'
  | 'textual_unknown';

export function isUnavailableBodyFatal(reason: BodyUnavailableReason): boolean {
  return reason === 'textual_unknown';
}

export async function readDownloadBytes(
  stream: AsyncIterable<Uint8Array>,
  maxBytes = 10 * 1024 * 1024
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new Error('download_capture_limit');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, size);
}

export function isCaptureWithinLimits(
  bodyBytes: number,
  totalBytes: number,
  maxBodyBytes: number,
  maxTotalBytes: number
): boolean {
  return (
    Number.isSafeInteger(bodyBytes) &&
    Number.isSafeInteger(totalBytes) &&
    bodyBytes >= 0 &&
    totalBytes >= 0 &&
    bodyBytes <= maxBodyBytes &&
    totalBytes + bodyBytes <= maxTotalBytes
  );
}

function headerValue(
  headers: CaptureHeader[],
  name: string
): string | undefined {
  return headers.find(
    (header) => header.name.toLowerCase() === name.toLowerCase()
  )?.value;
}

/** Classify only response bodies that HTTP semantics or explicit download metadata can omit. */
export function classifyUnavailableBody(
  method: string,
  status: number,
  headers: CaptureHeader[],
  resourceType = ''
): BodyUnavailableReason {
  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod === 'HEAD' || status === 204 || status === 304) {
    return 'no_body_status';
  }

  const contentLength = headerValue(headers, 'content-length');
  if (contentLength !== undefined && /^0+$/.test(contentLength.trim())) {
    return 'zero_length';
  }

  const disposition = headerValue(headers, 'content-disposition');
  if (disposition && /^attachment(?:\s*;|$)/i.test(disposition.trim())) {
    return 'attachment';
  }

  const contentType = headerValue(headers, 'content-type') ?? '';
  if (
    /^(?:image|font|audio|video)\//i.test(contentType) ||
    /^application\/(?:pdf|octet-stream|zip|x-7z-compressed|vnd\.)/i.test(
      contentType
    ) ||
    ['image', 'font', 'media'].includes(resourceType)
  ) {
    return 'binary_media';
  }
  return 'textual_unknown';
}
