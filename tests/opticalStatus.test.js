import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyRxPower,
  classifyTemperature,
  parseRxPowerDbm,
  parseTemperatureC,
} from '../app/helpers/opticalStatus.js';

describe('opticalStatus', () => {
  it('classifies RX power into colored buckets', () => {
    const good = classifyRxPower('-17.18');
    assert.equal(good.level, 'good');
    assert.equal(good.textClass, 'ui-optical-good');

    const critical = classifyRxPower('-30');
    assert.equal(critical.level, 'critical');
    assert.equal(critical.textClass, 'ui-optical-critical');
  });

  it('classifies temperature into colored buckets', () => {
    const warm = classifyTemperature('55');
    assert.equal(warm.level, 'warm');
    assert.equal(warm.textClass, 'ui-optical-warning');

    const hot = classifyTemperature('65');
    assert.equal(hot.level, 'hot');
    assert.equal(hot.textClass, 'ui-optical-critical');
  });

  it('parses CMCC raw values', () => {
    assert.ok(Math.abs(parseRxPowerDbm('191') - (-17.16)) < 0.1);
    assert.ok(Math.abs(parseTemperatureC('14183') - 55.4) < 0.2);
  });

  it('returns null status when value is missing', () => {
    assert.equal(classifyRxPower(''), null);
    assert.equal(classifyTemperature(null), null);
  });
});
