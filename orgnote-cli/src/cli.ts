import { Command } from '@commander-js/extra-typings';
import { version } from '../package.json';
import { CliCommand } from './commands/command-handlers';

export interface CliArguments {
  debug?: boolean;
  rootFolder?: string;
  force?: boolean;
  account?: string;
}

const commandDescriptionMan: { [key in CliCommand]: string } = {
  [CliCommand.Sync]: 'Synchronize files with remote server',
  [CliCommand.ValidateConfig]: 'Validate configuration file',
};

export function run(
  fn: (command: string, args: CliArguments) => Promise<void>
): Command {
  const program = new Command();
  program
    .name('orgnote-cli')
    .description('CLI tool for synchronizing files with OrgNote server')
    .version(version);

  Object.entries(commandDescriptionMan).forEach(([command, description]) => {
    program
      .command(command)
      .option('-d, --debug', 'Debug mode for more logs')
      .option('-r, --rootFolder <string>', 'Root folder for files')
      .option('-f, --force', 'Force operation, clear local cache before sync')
      .option('-a, --account <string>', 'Account name from config file')
      .description(description)
      .action(async (args) => await fn(command, args as CliArguments));
  });

  program.showHelpAfterError();
  program.parse(process.argv);
  return program;
}
