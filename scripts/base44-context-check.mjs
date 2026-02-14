import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const deprecatedPaths = [
  'src/components/nexus-os/README.jsx',
  'src/components/nexus-os/ui/os/NexusBootOverlay.jsx',
  'tacticalmapmockup.html',
];

const forbiddenImportRules = [
  {
    scopePrefix: 'src/',
    pattern: /@\/integrations\b/g,
    message: 'Legacy Base44 alias "@/integrations" is not allowed.',
  },
  {
    scopePrefix: 'src/',
    pattern: /@\/entities\b/g,
    message: 'Legacy Base44 alias "@/entities" is not allowed.',
  },
  {
    scopePrefix: 'src/',
    pattern: /npm:@base44\/sdk@/g,
    message: 'Frontend should not import Deno-style npm:@base44/sdk specifiers.',
  },
];

const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const nexusBase44ReadAdapterPath = 'src/components/nexus-os/services/base44CommsReadAdapter.ts';
const nexusUiManifestPath = 'src/components/nexus-os/base44/uiRefinementManifest.ts';
const nexusPreviewRoutePath = 'src/pages/NexusOSPreview.jsx';
const pagesConfigPath = 'src/pages.config.js';
const nexusDeprecatedDiscoveryDir = 'src/components/nexus-os/discovery';

function listFiles(dir) {
  const files = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const absolute = path.join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      files.push(...listFiles(absolute));
      continue;
    }
    files.push(absolute);
  }
  return files;
}

function toRepoPath(absolutePath) {
  return path.relative(repoRoot, absolutePath).replace(/\\/g, '/');
}

const violations = [];

for (const relativePath of deprecatedPaths) {
  if (existsSync(path.join(repoRoot, relativePath))) {
    violations.push({
      path: relativePath,
      reason: 'Deprecated artifact is present and should be purged.',
    });
  }
}

for (const requiredPath of [nexusBase44ReadAdapterPath, nexusUiManifestPath, nexusPreviewRoutePath, pagesConfigPath]) {
  if (!existsSync(path.join(repoRoot, requiredPath))) {
    violations.push({
      path: requiredPath,
      reason: 'Required Base44/NexusOS context file is missing.',
    });
  }
}

if (existsSync(path.join(repoRoot, pagesConfigPath))) {
  const pagesConfig = readFileSync(path.join(repoRoot, pagesConfigPath), 'utf8');
  if (!/"NexusOSWorkspace"\s*:/.test(pagesConfig)) {
    violations.push({
      path: pagesConfigPath,
      reason: 'NexusOSWorkspace route must remain registered.',
    });
  }
  if (!/"NexusOSPreview"\s*:/.test(pagesConfig)) {
    violations.push({
      path: pagesConfigPath,
      reason: 'NexusOSPreview route must remain registered for Base44 UI refinement.',
    });
  }
}

if (existsSync(path.join(repoRoot, nexusDeprecatedDiscoveryDir))) {
  const discoveryFiles = listFiles(path.join(repoRoot, nexusDeprecatedDiscoveryDir))
    .map((absolute) => toRepoPath(absolute));
  for (const filePath of discoveryFiles) {
    violations.push({
      path: filePath,
      reason: 'Deprecated NexusOS discovery artifact detected.',
    });
  }
}

for (const rootDir of ['src', 'functions']) {
  const absoluteRoot = path.join(repoRoot, rootDir);
  if (!existsSync(absoluteRoot)) continue;
  const files = listFiles(absoluteRoot);
  for (const absoluteFilePath of files) {
    const repoPath = toRepoPath(absoluteFilePath);
    if (!sourceExtensions.has(path.extname(repoPath))) continue;
    const content = readFileSync(absoluteFilePath, 'utf8');

    for (const rule of forbiddenImportRules) {
      if (!repoPath.startsWith(rule.scopePrefix)) continue;
      if (rule.pattern.test(content)) {
        violations.push({
          path: repoPath,
          reason: rule.message,
        });
      }
      rule.pattern.lastIndex = 0;
    }

    if (
      repoPath.startsWith('src/components/nexus-os/') &&
      repoPath !== nexusBase44ReadAdapterPath &&
      /api\/base44Client/.test(content)
    ) {
      violations.push({
        path: repoPath,
        reason:
          'NexusOS should route direct Base44 comms reads through base44CommsReadAdapter to avoid table lock-in.',
      });
    }
  }
}

if (violations.length > 0) {
  console.error('[base44-context-check] failed with violations:');
  for (const violation of violations) {
    console.error(`- ${violation.path}: ${violation.reason}`);
  }
  process.exit(1);
}

console.log('[base44-context-check] pass: Base44 context remains clean and non-legacy.');
