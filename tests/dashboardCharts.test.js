import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRxPowerDbm,
  parseTemperatureC,
  detectPonMode,
  aggregateDashboardCharts,
} from '../app/helpers/dashboardCharts.js';

describe('dashboardCharts', () => {
  it('parses CMCC raw RX and temperature', () => {
    assert.ok(Math.abs(parseRxPowerDbm('191') - (-17.16)) < 0.1);
    assert.ok(Math.abs(parseTemperatureC('14183') - 55.4) < 0.2);
  });

  it('detects EPON from X_CMCC config', () => {
    const mode = detectPonMode({
      parameters: {
        'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.RXPower': '191',
      },
    });
    assert.equal(mode, 'EPON');
  });

  it('detects GPON from virtual parameter', () => {
    const mode = detectPonMode({
      parameters: {
        'VirtualParameters.getponmode': 'GPON',
      },
    });
    assert.equal(mode, 'GPON');
  });

  it('aggregates dashboard chart series', () => {
    const charts = aggregateDashboardCharts([
      {
        manufacturer: 'CMHI',
        model: 'MJM-01',
        parameters: {
          'InternetGatewayDevice.WANDevice.1.X_CMCC_EponInterfaceConfig.RXPower': '191',
          'VirtualParameters.gettemp': '55',
        },
      },
      {
        manufacturer: 'ZTE',
        model: 'F660',
        parameters: {
          'VirtualParameters.getponmode': 'GPON',
          'VirtualParameters.RXPower': '-22',
          'VirtualParameters.gettemp': '48',
        },
      },
    ]);

    assert.equal(charts.totals.devices, 2);
    assert.ok(charts.byBrand.some((b) => b.name === 'CMHI' && b.count === 1));
    assert.ok(charts.ponMode.some((p) => p.name === 'EPON'));
    assert.ok(charts.ponMode.some((p) => p.name === 'GPON'));
    assert.ok(charts.rxPower.length >= 1);
    assert.ok(charts.temperature.length >= 1);
  });
});
