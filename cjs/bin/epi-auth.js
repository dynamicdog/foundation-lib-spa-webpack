#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import native Node.JS libraries
const readline_1 = __importDefault(require("readline"));
const url_1 = require("url");
// Import episerver libraries through ESM, as they are delivered as ESNext modules
const esm = require('esm')(module, {});
const epi = esm('@episerver/spa-core');
const ClientAuthStorage_1 = __importDefault(require("../ContentDelivery/ClientAuthStorage"));
class EpiAuthCli {
    /**
     *
     * @param { EpiAuthCliConfig } config
     */
    constructor(config) {
        this.config = config;
        // Configure CLI Interface
        this._rli = readline_1.default.createInterface(config.input || process.stdin, config.output || process.stdout);
        this._rli.write(`\n == Episerver CLI Authentication tool (${config.BaseURL}) == \n\n`);
        this._rli.stdoutMuted = false;
        this._rli._writeToOutput = function (stringToWrite) {
            if (!this.output)
                return;
            if (this.stdoutMuted)
                this.output.write("*".repeat(stringToWrite.length));
            else
                this.output.write(stringToWrite);
        };
        // Configure AUTH Api
        try {
            const u = new url_1.URL(config.BaseURL);
            const cd_api = new epi.ContentDelivery.API_V2({
                BaseURL: config.BaseURL,
                Debug: false,
                EnableExtensions: true
            });
            this._auth = new epi.ContentDelivery.DefaultAuthService(cd_api, ClientAuthStorage_1.default.CreateFromUrl(u));
        }
        catch (e) {
            this._rli.write(`\n\n\x1b[31mInvalid Episerver URL provided: ${config.BaseURL}\x1b[0m\n\n`);
            this._rli.close();
            process.exit(1);
        }
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const forceLogin = this.config.force || false;
            //console.log(forceLogin);process.exit(0);
            const auth = this.config.force ? false : yield this._auth.isAuthenticated().catch((e) => {
                this._rli.write(`\n\n\x1b[31mError while validating authentication status: ${e.message}\x1b[0m\n\n`);
                this._rli.close();
                process.exit(1);
            });
            if (auth) {
                const user = yield this._auth.currentUser();
                const answer = yield this.ask(`You are currently authenticated${user ? ' as\x1b[36m ' + user + '\x1b[0m' : ''}, do you want to reauthenticate? (Y/N) `);
                if (answer.toUpperCase() === 'Y') {
                    this._rli.write('\n');
                    return this.askCredentials();
                }
                this._rli.write('\n');
                this._rli.close();
            }
            else {
                this.askCredentials();
            }
        });
    }
    askCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            const user = this.config.username || (yield this.ask('Username: '));
            const pass = this.config.password || (yield this.ask('Password: ', true));
            return this.doLogin(user, pass);
        });
    }
    doLogin(user, pass) {
        this._rli.write(`\n\nAttempting to login\x1b[36m ${user}\x1b[0m, using provided password:`);
        this._auth.login(user, pass).catch((e) => {
            this._rli.write(`\x1b[31m\n\n !!! Login failed: ${e.message} !!!\x1b[0m\n\n`);
            this._rli.close();
            process.exit(1);
        }).then((success) => {
            this._rli.write(' ' + (success ? '\x1b[32msuccess\x1b[0m' : '\x1b[31minvalid credentials or locked account\x1b[0m') + '.\n\n');
            this._rli.close();
            process.exit(success ? 0 : 1);
        });
    }
    /**
     * Wrapper around the readline interface to provide a promises based method to ask
     * a question to the user.
     *
     * @protected
     * @param { string } question The question to be asked
     * @param { boolean } muted Whether or not the input must be muted
     * @returns { Promise<string> } The answer given by the user
     */
    ask(question, muted = false) {
        return new Promise((resolve, reject) => {
            this._rli.question(question, answer => {
                this._rli.stdoutMuted = false;
                resolve(answer);
            });
            this._rli.stdoutMuted = muted ? true : false;
        });
    }
}
const yargs_1 = __importDefault(require("yargs"));
const EpiEnvOptions_1 = __importDefault(require("../util/EpiEnvOptions"));
const CliApplication = __importStar(require("../util/CliArguments"));
// Read the Command Line arguments
const defaultEnv = EpiEnvOptions_1.default.Parse(process.env.NODE_ENV || '', EpiEnvOptions_1.default.Development);
const args = CliApplication
    .Setup((0, yargs_1.default)(process.argv.slice(2)), defaultEnv, "Optimizely CMS Login Script", cfg => cfg
    .alias('u', 'username')
    .describe('u', 'Insecurely pass username, only use from scripts that don\'t append to shell history')
    .string('u')
    .alias('p', 'password')
    .describe('p', 'Insecurely pass password, only use from scripts that don\'t append to shell history')
    .string('p')
    .alias('f', 'force')
    .describe('f', 'Force reauthentication, even if authentication is present')
    .boolean('f')
    .default('f', false)
    .group(['u', 'p', 'f'], 'Login parameters'))
    .argv;
// Query env for settings
const config = CliApplication.CreateConfig(args);
// Run the actual script
var auth = new EpiAuthCli({
    BaseURL: config.getEpiserverURL(),
    input: process.stdin,
    output: process.stdout,
    username: args.username,
    password: args.password,
    force: args.force
});
auth.start();
