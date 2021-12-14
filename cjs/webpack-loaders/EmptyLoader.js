"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loader_utils_1 = __importDefault(require("loader-utils"));
const schema_utils_1 = require("schema-utils");
/**
 * Webpack Empty loader configuration definition
 */
const schema = {
    type: 'object',
    properties: {}
};
/**
 * Webpack loader to emit empty resources, used to ignore SCSS file on Server
 * Side Rendering builds of the Episerver SPA
 *
 * @param   {string}  source    The source of the resource that must be loaded
 * @returns {string}            An empty string
 */
const EmptyLoader = (source) => {
    const options = loader_utils_1.default.getOptions(this);
    if (options) {
        (0, schema_utils_1.validate)(schema, options, { name: 'Empty loader' });
    }
    return '';
};
module.exports = EmptyLoader;
