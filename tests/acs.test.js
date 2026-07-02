import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCwmpPublicUrl } from '../app/helpers/acs.js';

describe('resolveCwmpPublicUrl', () => {
  it('prefers CWMP_PUBLIC_URL over APP_URL', () => {
    assert.equal(
      resolveCwmpPublicUrl({
        publicUrl: 'http://myacs.teslatech.my.id/cwmp',
        appUrl: 'https://myacs.teslatech.my.id',
        path: '/cwmp',
        enabled: true,
      }),
      'http://myacs.teslatech.my.id/cwmp',
    );
  });

  it('falls back to APP_URL + path', () => {
    assert.equal(
      resolveCwmpPublicUrl({
        publicUrl: '',
        appUrl: 'https://myacs.teslatech.my.id',
        path: '/cwmp',
        enabled: true,
      }),
      'https://myacs.teslatech.my.id/cwmp',
    );
  });
});
