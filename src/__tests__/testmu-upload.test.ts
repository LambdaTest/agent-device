import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vitest';
import { createCloudWebDriverCapabilities } from '../../packages/provider-webdriver/src/capabilities.ts';
import type { DeviceInfo } from '@agent-device/kernel/device';
import { createTestMuUploadApp } from '../../packages/provider-testmu/src/testmu.ts';
import { mkdtempForTest } from '../../packages/provider-webdriver/src/tmp-dir.fixtures.ts';
import { createWebDriverDeploymentRuntime } from '../../packages/provider-webdriver/src/runtime-deployment.ts';
import type { WebDriverProviderSession } from '../../packages/provider-webdriver/src/runtime-session.ts';

const device: DeviceInfo = {
  platform: 'android',
  id: 'webdriver:stale',
  name: 'Stale WebDriver device',
  kind: 'device',
  target: 'mobile',
  booted: true,
};

const iosDevice: DeviceInfo = { ...device, platform: 'apple', id: 'webdriver:ios' };
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

test('TestMu uploads the zipped simulator build that install-from-source extracted', async () => {
  const tempDir = await mkdtempForTest('agent-device-materialized-upload-');
  try {
    const archivePath = path.join(tempDir, 'App.app.zip');
    const installablePath = path.join(tempDir, 'extracted', 'App.app');
    await fs.writeFile(archivePath, 'zip bytes');
    await fs.mkdir(installablePath, { recursive: true });
    const uploadedNames: unknown[] = [];
    globalThis.fetch = async (_input, init) => {
      const body = init?.body;
      if (!(body instanceof FormData)) throw new Error('expected a multipart upload');
      uploadedNames.push((body.get('appFile') as File).name);
      return new Response(JSON.stringify({ app_id: 'APP42' }), { status: 200 });
    };
    const installApp = vi.fn(async () => undefined);
    const deployment = createWebDriverDeploymentRuntime({
      provider: 'testmu',
      uploadApp: createTestMuUploadApp({
        clientVersion: '0.0.0-test',
        username: 'user',
        accessKey: 'key',
      }),
      findSessionForDevice: () => activeSession(installApp),
    });

    await deployment.deployMaterializedApp(
      iosDevice,
      {
        artifact: {
          archivePath,
          installablePath,
          uploadPath: archivePath,
          cleanup: async () => {},
        },
      },
      new AbortController().signal,
    );

    expect(uploadedNames).toEqual(['App.app.zip']);
    expect(installApp).toHaveBeenCalledWith('lt://APP42', expect.any(AbortSignal));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

function activeSession(
  installApp: (appPath: string, signal?: AbortSignal) => Promise<void>,
): WebDriverProviderSession {
  return {
    capabilities: createCloudWebDriverCapabilities({
      provider: 'webdriver-test',
      platform: 'android',
    }),
    client: { installApp },
    prepared: {},
  } as unknown as WebDriverProviderSession;
}
