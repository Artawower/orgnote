import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const YALC_DEPENDENCY = 'file:.yalc/orgnote-api';
const PACKAGE_NAME = 'orgnote-api';

type Mode = 'to-npm' | 'to-yalc';

const rootDir = join(import.meta.dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');

const isJjRepo = (): boolean => existsSync(join(rootDir, '.jj'));
const isGitRepo = (): boolean => existsSync(join(rootDir, '.git'));

const run = (command: string): string => {
  return execSync(command, { cwd: rootDir, encoding: 'utf-8' }).trim();
};

const readPackageJson = (): Record<string, unknown> => {
  const content = readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(content);
};

const writePackageJson = (pkg: Record<string, unknown>): void => {
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
};

const getCurrentVersion = (pkg: Record<string, unknown>): string => {
  const deps = pkg.dependencies as Record<string, string>;
  return deps[PACKAGE_NAME] ?? '';
};

const isUsingYalc = (version: string): boolean => {
  return version === YALC_DEPENDENCY;
};

const getLatestNpmVersion = (): string => {
  const version = run(`npm view ${PACKAGE_NAME} version`);
  if (!version) {
    throw new Error(`Failed to get ${PACKAGE_NAME} version from npm`);
  }
  return version;
};

const setDependencyVersion = (pkg: Record<string, unknown>, version: string): void => {
  const deps = pkg.dependencies as Record<string, string>;
  deps[PACKAGE_NAME] = version;
};

const stageFiles = (): void => {
  if (isGitRepo()) {
    run('git add package.json bun.lock');
  }
};

const installDependencies = (): void => {
  run('bun install');
};

const restoreYalc = (): void => {
  run('yalc add orgnote-api');
  installDependencies();
};

const toNpm = (): void => {
  const pkg = readPackageJson();
  const currentVersion = getCurrentVersion(pkg);

  if (!isUsingYalc(currentVersion)) {
    console.log('📦 Already using npm version, skipping...');
    return;
  }

  const vcs = isJjRepo() ? 'jj' : 'git';
  const latestVersion = getLatestNpmVersion();
  console.log(`📦 [${vcs}] Switching to orgnote-api@${latestVersion} from npm...`);

  setDependencyVersion(pkg, latestVersion);
  writePackageJson(pkg);
  installDependencies();
  stageFiles();

  console.log(`✅ Switched to orgnote-api@${latestVersion}`);
};

const toYalc = (): void => {
  const pkg = readPackageJson();
  const currentVersion = getCurrentVersion(pkg);

  if (isUsingYalc(currentVersion)) {
    console.log('📦 Already using yalc, skipping...');
    return;
  }

  const vcs = isJjRepo() ? 'jj' : 'git';
  console.log(`📦 [${vcs}] Restoring yalc orgnote-api...`);

  restoreYalc();

  console.log('✅ Restored yalc orgnote-api');
};

const main = (): void => {
  const mode = process.argv[2] as Mode | undefined;

  if (mode === 'to-npm') {
    toNpm();
  } else if (mode === 'to-yalc') {
    toYalc();
  } else {
    console.error('Usage: bun scripts/swap-orgnote-api.ts <to-npm|to-yalc>');
    process.exit(1);
  }
};

main();
