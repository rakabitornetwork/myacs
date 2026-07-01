import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isConnectionRequestEvent, isBootEvent } from '../app/helpers/cwmpEvents.js';

describe('cwmpEvents', () => {
  it('detects CONNECTION REQUEST event', () => {
    assert.equal(isConnectionRequestEvent(['6 CONNECTION REQUEST']), true);
    assert.equal(isConnectionRequestEvent(['2 PERIODIC']), false);
  });

  it('detects BOOT event', () => {
    assert.equal(isBootEvent(['1 BOOT']), true);
    assert.equal(isBootEvent(['2 PERIODIC']), false);
  });
});
