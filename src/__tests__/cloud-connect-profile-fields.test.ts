import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from '@agent-device/kernel/errors';
import { resolveCloudWebDriverConnectProfile } from '../cli/connection/cloud-webdriver-profile.ts';
import { runCliCapture } from './cli-capture.ts';
import { mkdtempForTestSync } from './test-utils/tmp-dir.ts';

test('connect limrun refuses profile fields Limrun does not read', async () => {
  const result = await runCliCapture(
    [
      'connect',
      'limrun',
      '--platform',
      'ios',
      '--provider-os-version',
      '18',
      '--provider-geo-location',
      'US',
      '--json',
    ],
    {
      env: { LIMRUN_API_KEY: 'lim_test_key' },
      stateDirPrefix: 'agent-device-connect-limrun-profile-fields-',
    },
  );
  assert.equal(result.code, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.error.code, 'INVALID_ARGS');
  assert.deepEqual(payload.error.details.flags, [
    '--provider-os-version',
    '--provider-geo-location',
  ]);
});

test('connect browserstack refuses AWS Device Farm flags', () => {
  const tempRoot = mkdtempForTestSync('agent-device-connect-browserstack-reject-');

  try {
    assert.throws(
      () =>
        resolveCloudWebDriverConnectProfile({
          provider: 'browserstack',
          stateDir: path.join(tempRoot, '.state'),
          cwd: tempRoot,
          env: {},
          flags: {
            json: false,
            help: false,
            version: false,
            platform: 'android',
            device: 'Google Pixel 8',
            awsProjectArn: 'arn:aws:devicefarm:us-west-2:123:project:project-a',
          },
        }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, 'INVALID_ARGS');
        assert.equal(error.details?.provider, 'browserstack');
        assert.deepEqual(error.details?.flags, ['--aws-project-arn']);
        return true;
      },
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
