/// <reference types="node" />
import yargs from 'yargs';
import { URL } from 'url';
import { EpiEnvOption } from './EpiEnvOptions';
import GlobalConfig from './Config';
import { DotenvParseOutput } from 'dotenv/types';
export type CliArgs = {
    e: EpiEnvOption;
    d: URL | undefined;
    i: boolean | undefined;
    env: CliArgs['e'];
    environment: CliArgs['e'];
    domain: CliArgs['d'];
    insecure: CliArgs['i'];
};
type ConfigureCallback<T extends object = {}> = (yargs: yargs.Argv<T>) => void;
type SetupFunction = <T extends object = {}>(yargs: yargs.Argv<{}>, defaultEnv?: EpiEnvOption, name?: string, config?: ConfigureCallback<T & CliArgs>) => yargs.Argv<T & CliArgs>;
export declare const Setup: SetupFunction;
export declare const CreateConfig: (cliArgs: yargs.Arguments<CliArgs>, overrides?: DotenvParseOutput) => GlobalConfig;
export default Setup;
