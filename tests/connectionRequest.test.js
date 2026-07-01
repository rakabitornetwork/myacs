import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Test URL stripping logic via sendConnectionRequest error path
import { sendConnectionRequest } from '../app/services/connectionRequest.js';

describe('sendConnectionRequest URL handling', () => {
  it('does not throw when URL contains embedded credentials', async () => {
    // Will fail to connect but must NOT throw "includes credentials" fetch error
    try {
      await sendConnectionRequest('http://msn:msn@127.0.0.1:1/tr69', {
        username: 'msn',
        password: 'msn',
      });
    } catch (err) {
      assert.ok(!String(err.message).includes('includes credentials'));
    }
  });
});
