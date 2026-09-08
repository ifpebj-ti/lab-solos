import axios from 'axios';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiTestUrl } from './constants';
import { testFixtures } from './fixtures';
import { server } from './server';

describe('MSW HTTP test infrastructure', () => {
  it('intercepts a real Axios request with a sanitized fixture', async () => {
    const response = await axios.get(apiTestUrl);

    expect(response.data).toEqual(testFixtures.health);
  });

  it('allows a test-local handler override', async () => {
    server.use(
      http.get(apiTestUrl, () =>
        HttpResponse.json({ status: 'overridden-for-this-test' })
      )
    );

    const response = await axios.get(apiTestUrl);

    expect(response.data).toEqual({ status: 'overridden-for-this-test' });
  });

  it('resets handler overrides before the next test', async () => {
    const response = await axios.get(apiTestUrl);

    expect(response.data).toEqual(testFixtures.health);
  });

  it('fails unexpected requests', async () => {
    await expect(
      fetch('http://localhost:8080/api/test/unexpected')
    ).rejects.toThrow();
  });
});
