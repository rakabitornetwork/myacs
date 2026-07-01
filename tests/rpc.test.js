import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTaskRpc,
  extractParameterNames,
  extractParameterValues,
  findResponseType,
} from '../app/services/cwmp/rpc.js';

test('buildTaskRpc creates Upload RPC', () => {
  const rpc = buildTaskRpc({
    _id: 'abc123',
    method: 'Upload',
    payload: {
      url: 'https://acs.example/cwmp/upload/abc123',
      fileType: '1 Vendor Configuration File',
    },
  });

  assert.equal(rpc.Upload.URL, 'https://acs.example/cwmp/upload/abc123');
  assert.equal(rpc.Upload.CommandKey, 'abc123');
});

test('buildTaskRpc creates GetParameterNames RPC', () => {
  const rpc = buildTaskRpc({
    _id: 'x',
    method: 'GetParameterNames',
    payload: { path: 'Device.', nextLevel: true },
  });

  assert.equal(rpc.GetParameterNames.ParameterPath, 'Device.');
  assert.equal(rpc.GetParameterNames.NextLevel, true);
});

test('extractParameterValues parses SOAP body', () => {
  const params = extractParameterValues({
    GetParameterValuesResponse: {
      ParameterList: {
        ParameterValueStruct: [
          { Name: 'Device.DeviceInfo.SerialNumber', Value: { '#text': 'SN001' } },
        ],
      },
    },
  });

  assert.equal(params['Device.DeviceInfo.SerialNumber'], 'SN001');
});

test('extractParameterNames parses SOAP body', () => {
  const names = extractParameterNames({
    GetParameterNamesResponse: {
      ParameterList: {
        ParameterInfoStruct: [{ Name: 'Device.DeviceInfo.' }, { Name: 'Device.Time.' }],
      },
    },
  });

  assert.deepEqual(names, ['Device.DeviceInfo.', 'Device.Time.']);
});

test('findResponseType detects UploadResponse', () => {
  assert.equal(findResponseType({ UploadResponse: {} }), 'UploadResponse');
});
