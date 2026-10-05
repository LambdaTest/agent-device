import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'vitest';
import { runCmdSync } from '@agent-device/host-kit/command';
import { createPluginHost } from './host.ts';
import { mkdtempForTestSync } from '../__tests__/test-utils/tmp-dir.ts';

test('archiving replaces a stale archive instead of merging into it', async () => {
  const root = mkdtempForTestSync('plugin-host-archive-');
  try {
    const archivePath = path.join(root, 'App.zip');
    fs.mkdirSync(path.join(root, 'Stale.app'));
    fs.writeFileSync(path.join(root, 'Stale.app', 'Info.plist'), 'stale');
    runCmdSync('zip', ['-qr', archivePath, 'Stale.app'], { cwd: root });
    fs.mkdirSync(path.join(root, 'App.app'));
    fs.writeFileSync(path.join(root, 'App.app', 'Info.plist'), 'fresh');

    await createPluginHost({}, undefined).apple.archiveDirectory({
      sourceDirectory: root,
      entryName: 'App.app',
      archivePath,
    });

    const entries = runCmdSync('unzip', ['-Z1', archivePath]).stdout.trim().split('\n');
    assert.deepEqual(entries.sort(), ['App.app/', 'App.app/Info.plist']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
