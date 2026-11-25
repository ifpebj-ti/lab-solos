import { http, HttpResponse } from 'msw';

import { apiTestUrl } from './constants';
import { testFixtures } from './fixtures';

export const handlers = [
  http.get(apiTestUrl, () => HttpResponse.json(testFixtures.health)),
  http.options('*', ({ request }) =>
    new HttpResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
          request.headers.get('access-control-request-headers') ??
          'Content-Type, X-CSRF-Token',
      },
    })
  ),
];
