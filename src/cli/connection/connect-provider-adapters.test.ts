import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'vitest';
import { AppError } from '@agent-device/kernel/errors';
import { resolveConnectProviderProfile } from './connect-provider-adapters.ts';
import { pluginHome, selectPlugin, webDriverPluginSource } from '../../plugins/plugin.fixtures.ts';

test('connect refuses a field a WebDriver plugin declares refused before its resolve runs', async () => {
  const { home, env } = pluginHome();
  const marker = path.join(home, 'resolved');
  const connection = `{
    resolve: () => {
      fs.writeFileSync(${JSON.stringify(marker)}, 'yes');
      return { profile: { leaseProvider: 'example', platform: 'android' } };
    },
    verify: async () => ({}),
  }`;
  selectPlugin(
    home,
    'example',
    'example',
    `import fs from 'node:fs';\n${webDriverPluginSource('example', ['awsProjectArn'], connection)}`,
  );

  await assert.rejects(
    resolveConnectProviderProfile({
      provider: 'example',
      flags: {
        json: false,
        help: false,
        version: false,
        platform: 'android',
        awsProjectArn: 'arn:project',
      },
      stateDir: path.join(home, 'state'),
      cwd: home,
      env,
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, 'INVALID_ARGS');
      assert.equal(error.details?.provider, 'example');
      assert.deepEqual(error.details?.flags, ['--aws-project-arn']);
      return true;
    },
  );
  assert.ok(!fs.existsSync(marker));
});
