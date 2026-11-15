import { validateConfigFile } from '../config.js';

export async function validateConfig(): Promise<void> {
  const result = validateConfigFile();

  console.log('Config path: %s\n', result.configPath);
  console.log('='.repeat(60));
  console.log('Config file content:\n');
  
  if (result.rawContent) {
    console.log(result.rawContent);
  } else {
    console.log('(empty or not found)');
  }
  
  console.log('='.repeat(60));
  console.log('Validation result:\n');

  if (result.valid) {
    console.log('✓ Config is valid');
    console.log('  Accounts found: %s', result.accounts.join(', '));
    return;
  }

  console.error('✗ Config is invalid');
  result.errors.forEach((error) => {
    console.error('  - %s', error);
  });

  process.exit(1);
}
