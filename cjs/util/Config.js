"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalConfig = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const dotenv_expand_1 = __importDefault(require("dotenv-expand"));
const EpiEnvOptions_1 = __importDefault(require("./EpiEnvOptions"));
/**
 * Episerver SPA Configuration helper, to easily create Webpack config files,
 * which are using a .env file to store environment specific configuration
 * values.
 */
class GlobalConfig {
    /**
     * Create a new configuration helper for the current context
     *
     * @param {string} rootDir The root path of the application
     * @param {DotenvParseOutput} localOverrides The environment variables set by the Webpack CLI
     */
    constructor(rootDir, localOverrides = {}, envName) {
        this._rootDir = rootDir || process.cwd();
        if (!fs_1.default.existsSync(this._rootDir)) {
            throw new Error('Invalid application root directory');
        }
        this._localOverrides = localOverrides;
        this._envName = EpiEnvOptions_1.default.Parse(envName || localOverrides.EPI_ENV || process.env.EPI_ENV || process.env.NODE_ENV || '', 'development');
        // Apply .env files and afterwards expand them
        this.getEnvFiles()
            .map(dotEnvFile => dotenv_1.default.config({ path: dotEnvFile }))
            .forEach(x => (0, dotenv_expand_1.default)(x));
        // Create local env
        this._myEnv = {};
        Object.assign(this._myEnv, process.env, this._localOverrides);
        // Update NODE_ENV if not set
        if (!this._myEnv['NODE_ENV']) {
            this.override('NODE_ENV', this._envName == EpiEnvOptions_1.default.Development ? 'development' : 'production');
        }
    }
    /**
     * Retrieve the main application folder, as understood by this configuration
     * helper.
     *
     * @returns { string }
     */
    getRootDir() {
        return this._rootDir;
    }
    /**
     * Retrieve the absolute path to the folder containing the main application
     * sources
     *
     * @returns { string }
     */
    getSourceDir(localEnvironment = {}) {
        return path_1.default.resolve(this.getRootDir(), this.getSourcePath(localEnvironment)).replace(/\\/g, "/");
    }
    getServerDir(localEnvironment = {}) {
        return path_1.default.resolve(this.getRootDir(), this.getServerPath(localEnvironment)).replace(/\\/g, "/");
    }
    getAssetDir(localEnvironment = {}) {
        return path_1.default.resolve(this.getRootDir(), this.getAssetPath(localEnvironment)).replace(/\\/g, "/");
    }
    getDistDir(localEnvironment = {}) {
        return path_1.default.resolve(this.getRootDir(), this.getDistPath(localEnvironment)).replace(/\\/g, "/");
    }
    /**
     * Override a specific environment variable within this configuration context.
     *
     * @param   {string}    key The environment key to override
     * @param   {string}    value The new value of the environment key
     * @returns {this}      The current configuration for command chaining
     */
    override(key, value) {
        this._myEnv[key] = value;
        process.env[key] = '0';
        return this;
    }
    /**
     * Get the list of .env files that will be processed by the configuration
     */
    getEnvFiles() {
        let files = [".env", ".env.local", `.env.${this._envName}.local`];
        return files
            .map(x => path_1.default.join(this._rootDir, x))
            .filter(x => fs_1.default.existsSync(x) && fs_1.default.statSync(x).isFile())
            .reverse();
    }
    /**
    * Retrieve the path were the code for the Episerver SPA Server Side
    * Rendering can be found, relative to the current path
    *
    * Environment variable: SERVER_PATH
    *
    * @public
    * @param {DotenvParseOutput} localEnvironment     The local overrides, if not already specified or different from the constructor
    * @param {string} defaultValue         The default value if not set - by default 'server'
    * @returns {string}
    */
    getServerPath(localEnvironment = {}, defaultValue = 'server') {
        return this.getEnvVariable('SERVER_PATH', defaultValue, localEnvironment);
    }
    /**
     * The path within the main Episerver site where the SPA needs to be
     * placed. This value shall used both in building the file target path
     * as well as the web path for the resources.
     *
     * Environment variable: SPA_PATH
     *
     * @public
     * @param {DotenvParseOutput} localEnvironment     The local overrides, if not already specified or different from the constructor
     * @param {string} defaultValue         The default value if not set - by default 'spa'
     * @returns {string}
     */
    getSpaPath(localEnvironment = {}, defaultValue = 'Spa') {
        return this.getEnvVariable('SPA_PATH', defaultValue, localEnvironment);
    }
    /**
     * The path - relative to the current path - where the main Episerver
     * project is located.
     *
     * Environment variable: EPI_PATH
     *
     * @public
     * @param {DotenvParseOutput} localEnvironment     The local overrides, if not already specified or different from the constructor
     * @param {string} defaultValue         The default value if not set - by default '../Foundation'
     * @returns {string}
     */
    getEpiPath(localEnvironment = {}, defaultValue = '../Foundation') {
        return this.getEnvVariable('EPI_PATH', defaultValue, localEnvironment);
    }
    /**
     * The path at which the application will be running, relative to the
     * domain
     *
     * Environment variable: WEB_PATH
     *
     * @public
     * @param {DotenvParseOutput} localEnvironment     The local overrides, if not already specified or different from the constructor
     * @param {string} defaultValue         The default value if not set - by default '/'
     * @returns {string}
     */
    getWebPath(localEnvironment = {}, defaultValue = '/') {
        return this.getEnvVariable('WEB_PATH', defaultValue, localEnvironment);
    }
    getPublicUrl(localEnvironment = {}, defaultValue = '') {
        return this.getEnvVariable('PUBLIC_URL', defaultValue, localEnvironment) || this.getEpiserverURL();
    }
    getSourcePath(localEnvironment = {}, defaultValue = 'src') {
        return this.getEnvVariable('SRC_PATH', defaultValue, localEnvironment);
    }
    getAssetPath(localEnvironment = {}, defaultValue = 'public') {
        return this.getEnvVariable('ASSET_PATH', defaultValue, localEnvironment);
    }
    getDistPath(localEnvironment = {}, defaultValue = 'dist') {
        return this.getEnvVariable('DIST_PATH', defaultValue, localEnvironment);
    }
    getEpiserverFormsDir(localEnvironment = {}, defaultValue = 'Scripts/EPiServer.ContentApi.Forms') {
        return this.getEnvVariable('EPI_FORMS_PATH', defaultValue, localEnvironment);
    }
    getNodeEnv(localEnvironment = {}, defaultValue = 'development') {
        return this.getEnvVariable("NODE_ENV", defaultValue, localEnvironment);
    }
    getEpiEnvironment() {
        return this._envName;
    }
    isEpiserverFormsEnabled(localEnvironment = {}, defaultValue = 'false') {
        return this.getEnvVariable('EPI_FORMS_INCLUDE', defaultValue, localEnvironment).toLowerCase() == 'true';
    }
    /**
     * Retrieve the URL at which Episerver is running, always ending with a
     * slash. This shall be used to connect to Episerver by the application,
     * this URL could be different from the URL where the application runs.
     *
     * @public
     * @param {DotenvParseOutput} localEnvironment Additional environment overrides to those provided in the constructor
     * @param {string} defaultValue     The default value if none set by the environment
     * @returns {string}
     */
    getEpiserverURL(localEnvironment = {}, defaultValue = '/') {
        let base_url = this.getEnvVariable('EPI_URL', defaultValue, localEnvironment);
        if (base_url.substr(-1) !== '/') {
            base_url = base_url + '/';
        }
        return base_url;
    }
    /**
     * Generate the resolve configuration for Webpack
     *
     * @public
     * @param   {DotenvParseOutput}    envOverrides    The Environment overrides through the Webpack CLI
     * @returns {object}    The Resolve configuration for Webpack
     */
    getResolveConfig(envOverrides) {
        const tsConfigFile = path_1.default.resolve(this._rootDir, this.getEnvVariable('TS_CONFIG_FILE', 'tsconfig.json', envOverrides));
        const alias = {};
        if (fs_1.default.existsSync(tsConfigFile)) {
            console.log('Building resolve configuration from TypeScript config file: ', tsConfigFile);
            const tsConfig = JSON.parse(fs_1.default.readFileSync(tsConfigFile).toString());
            var paths = (tsConfig.compilerOptions || {}).paths || {};
            var baseUrl = (tsConfig.compilerOptions || {}).baseUrl || '';
            for (var prefix in paths) {
                var webpackPrefix = prefix.replace(/[\/\\]\*$/, '');
                let prefixPath = Array.isArray(paths[prefix]) ? paths[prefix][0] : (typeof (paths[prefix]) === "string" ? paths[prefix] : "");
                alias[webpackPrefix] = path_1.default.resolve(this._rootDir, baseUrl, prefixPath.replace(/[\/\\]\*$/, ''));
            }
        }
        else {
            alias["app"] = path_1.default.resolve(this._rootDir, this.getSourcePath(envOverrides));
            alias["app.server"] = path_1.default.resolve(this._rootDir, this.getServerPath(envOverrides));
        }
        const resolveConfig = {
            alias: alias,
            extensions: ['.js', '.jsx', '.json', '.tsx', '.ts']
        };
        if (this.isEpiserverFormsEnabled()) {
            const formsDir = path_1.default.resolve(this._rootDir, this.getEpiserverFormsDir(envOverrides));
            resolveConfig.alias["EPiServer.ContentApi.Forms"] = formsDir;
        }
        return resolveConfig;
    }
    /**
     * Create a list of NodeJS variables that will be replaced by their value
     * during the build process. This "fixates" the value in run-time.
     *
     * @param {DotenvParseOutput} envOverrides A list of overrides for the environment variables
     * @returns {object} The configuration for the Webpack Define Plugin
     */
    getDefineConfig(envOverrides = {}) {
        return {
            'process.env.NODE_ENV': JSON.stringify(this.getNodeEnv(envOverrides)),
            'process.env.EPI_URL': JSON.stringify(this.getEpiserverURL(envOverrides)),
            'process.env.WEB_PATH': JSON.stringify(this.getWebPath(envOverrides))
        };
    }
    /**
     * Read a value from the NodeJS Environment
     *
     * @public
     * @param {string} key              The name of the environment variable
     * @param {T} defaultValue     The default value
     * @param {DotenvParseOutput} overrides        Overrides for the environment
     * @returns {string|T}                The value of the environment variable, or the defaultValue if it evaluates to false
     */
    getEnvVariable(key, defaultValue, overrides) {
        const env = overrides ? Object.assign({}, this._myEnv, overrides) : this._myEnv;
        const val = env[key];
        return val || defaultValue;
    }
}
exports.GlobalConfig = GlobalConfig;
exports.default = GlobalConfig;
