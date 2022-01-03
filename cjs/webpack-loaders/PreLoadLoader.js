"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const loader_utils_1 = __importDefault(require("loader-utils"));
const schema_utils_1 = require("schema-utils");
const glob_1 = __importDefault(require("glob"));
const path_1 = __importDefault(require("path"));
const schema = {
    type: "object",
    properties: {
        pattern: {
            type: "string",
        },
        extension: {
            type: "string",
        },
        exclude: {
            type: "string",
        },
    },
    required: ["pattern", "extension"],
};
/**
 * Find and replace the @PreLoad annotation within a
 * TypeScript file to automatically create a pre-load
 * of normally dynamically loaded modules.
 *
 * @param   {string}    source  The source prepared by Webpack
 * @returns {string}    The source with the injected preloading code
 */
function PreLoadLoader(source) {
    // @ts-ignore: This is controlled by Webpack so allowing usage here
    const loaderContext = this;
    const options = loader_utils_1.default.getOptions(loaderContext);
    (0, schema_utils_1.validate)(schema, options, { name: "PreLoad loader" });
    var test = /\@PreLoad\("(.*)"\,"(.*)"\,"(.*)"\)/;
    var matches = source.match(test);
    if (matches) {
        console.log("Found @PreLoad annotation in: " + (loaderContext === null || loaderContext === void 0 ? void 0 : loaderContext.resourcePath));
        //Context
        const toReplace = matches[0];
        const component_path = matches[1];
        const variable = matches[2];
        const component_prefix = matches[3];
        const component_dir = path_1.default.resolve(loaderContext.context, component_path);
        const files = glob_1.default.sync(component_dir + "/" + options.pattern, {
            ignore: "**/*.stories.tsx",
        });
        //Debug
        console.log("  - Search pattern: " + component_dir + "/" + options.pattern);
        console.log("  - Variable: " + variable);
        console.log("  - Component prefix: " + component_prefix);
        //Start building script
        const script = [];
        const script_end = [];
        if (!variable.includes(".")) {
            // Declare the global variable if there's no scope provided
            console.log("  - Injecting TypeScript variable declaration");
            script.push("declare var " + variable + ": any;");
        }
        script.push("try { " +
            variable +
            " = " +
            variable +
            " || {}; } catch (e) { " +
            variable +
            " = {}; }\n");
        //Handle components
        files.forEach(function (file) {
            // 1. Get the name of the module from the file
            const module_name = path_1.default.basename(file, options.extension);
            // 2. Get the path of the module, relative to the starting point (making sure we use a forward slash as delimiter)
            const module_path = path_1.default
                .relative(component_dir, path_1.default.dirname(file))
                .replace(/[\\]/gi, "/");
            // 3. Build the full import path used to import the module
            const module_import = component_prefix +
                (module_path ? module_path + "/" : "") +
                module_name;
            // 4. Create the variable name
            const module_varname = module_path.replace(/[\/]/gi, "") + module_name;
            // 5. Push the needed lines of code
            script.push("import " + module_varname + " from '" + module_import + "';");
            script_end.push(variable + '["' + module_import + '"] = ' + module_varname + ";");
        }.bind(loaderContext));
        const inject = [
            "// Start: Injected PreLoad script",
            script.join("\n"),
            script_end.join("\n"),
            "// End: Injected PreLoad script",
        ].join("\n") + "\n";
        const newSource = source.replace(toReplace, inject);
        console.log("  - Injected " + files.length + " modules into " + variable + "\n");
        return newSource;
    }
    return source;
}
module.exports = PreLoadLoader;
