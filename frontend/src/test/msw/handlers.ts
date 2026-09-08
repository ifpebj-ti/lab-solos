import { http, HttpResponse } from 'msw';

import { apiTestUrl } from './constants';
import { testFixtures } from './fixtures';

export const handlers = [
  http.get(apiTestUrl, () => HttpResponse.json(testFixtures.health)),
];
