import _Config from './util/Config';
import _EpiEnvOptions, { EpiEnvOption as _EpiEnvOption } from './util/EpiEnvOptions';
import _DeployToEpiserverPlugin, { DeployToEpiserverPluginOptions as _DeployToEpiserverPluginOptions } from './webpack-plugins/DeployToEpiserverPlugin';
export declare const PreLoadLoader: (source: string) => string;
export declare const EmptyLoader: (source: string) => string;
export declare const Config: typeof _Config;
export declare const EpiEnvOptions: typeof _EpiEnvOptions;
export declare const DeployToEpiserverPlugin: typeof _DeployToEpiserverPlugin;
export declare type DeployToEpiserverPluginOptions = _DeployToEpiserverPluginOptions;
export declare type EpiEnvOption = _EpiEnvOption;
declare const _default: {
    PreLoadLoader: (source: string) => string;
    EmptyLoader: (source: string) => string;
    Config: typeof _Config;
    EpiEnvOptions: typeof _EpiEnvOptions;
    DeployToEpiserverPlugin: typeof _DeployToEpiserverPlugin;
};
export default _default;
