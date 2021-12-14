#!/usr/bin/env node
"use strict";
/**
 * Main entry point for the epi-sync-models command, loads the context
 * and starts the script as ESNext Modules.
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import dependencies
const yargs_1 = __importDefault(require("yargs"));
const EpiEnvOptions_1 = __importDefault(require("../util/EpiEnvOptions"));
const CliApplication = __importStar(require("../util/CliArguments"));
// Load main module through ESM
const esm = require('esm')(module, {});
const syncModule = esm('./epi_sync_models.module');
// Create context
const defaultEnv = EpiEnvOptions_1.default.Parse(process.env.NODE_ENV || '', EpiEnvOptions_1.default.Development);
const args = CliApplication.Setup((0, yargs_1.default)(process.argv.slice(2)), defaultEnv, "Episerver Command Line Model Synchronization")
    .argv;
const config = CliApplication.CreateConfig(args);
// Execute
const sync = new syncModule.EpiModelSync(config);
sync.run();
