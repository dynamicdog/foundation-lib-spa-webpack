"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EpiModelSync = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// Import from Spa Core
const spa_core_1 = require("@episerver/spa-core");
const StringUtils = spa_core_1.Services.String;
const ClientAuthStorage_1 = __importDefault(require("../ContentDelivery/ClientAuthStorage"));
function isNetworkErrorResponse(toTest) {
    if (!toTest)
        return false;
    if (typeof toTest !== "object")
        return false;
    return toTest.error &&
        toTest.contentType
        ? true
        : false;
}
/**
 * Episerver Model Synchronization Job
 */
class EpiModelSync {
    /**
     * Create a new instance of the job
     *
     * @param {string} spaDir      The directory where the SPA is located
     * @param {string} envDir      The environment directory to use as configuration source, if different from the spaDir
     */
    constructor(config) {
        this._modelDir = "src/Models/Episerver";
        this._servicePath = "api/episerver/v3/model";
        this._iContentProps = ["contentLink"];
        this._config = config;
        this._rootDir = config.getRootDir();
        // Configure Episerver Connection
        const u = new url_1.URL(this._config.getEpiserverURL());
        this._api = new spa_core_1.ContentDelivery.API_V2({
            BaseURL: u.href,
            Debug: false,
            EnableExtensions: true,
        });
        this._auth = new spa_core_1.ContentDelivery.DefaultAuthService(this._api, ClientAuthStorage_1.default.CreateFromUrl(u));
        this._api.TokenProvider = this._auth;
    }
    /**
     * Run the configuration job
     */
    run() {
        console.log("***** Start: Episerver IContent Model Synchronization *****");
        console.log(" - Using Episerver installed at: " + this._api.BaseURL);
        this._auth.currentUser().then((u) => {
            if (u)
                console.log(` - Authenticated as ${u}`);
            else
                console.log(" - Using an unauthenticated connections");
        });
        console.log(" - Ensuring models directory exists (" + this.getModelPath() + ")");
        console.log(" - Retrieving content types");
        const me = this;
        this._doRequest(this.getServiceUrl())
            .then((r) => {
            if (!r)
                return;
            const modelNames = r.map((x) => x.name);
            me.clearModels(modelNames.map((x) => me.getModelInterfaceName(x)));
            console.log(" - Start creating/updating model definitions");
            r.forEach((model) => me.createModelFile(model, modelNames));
            me.createAsyncTypeMapper(modelNames);
        })
            .catch((reason) => console.log(reason));
    }
    /**
     * Generate a TypeMapper component which enables loading of the types from Episerver
     *
     * @protected
     * @param {string[]} allItemNames The model names fetched from Episerver
     * @returns {void}
     */
    createAsyncTypeMapper(allItemNames) {
        const mapperFile = path_1.default.join(this.getModelPath(), "TypeMapper.ts");
        let mapper = "import { Taxonomy, Core, Loaders } from '@episerver/spa-core';\n";
        // allItemNames.forEach(x => mapper += "import {"+this.getModelInstanceName(x)+"} from './"+ this.getModelInterfaceName(x)+"';\n")
        mapper +=
            "\nexport default class TypeMapper extends Loaders.BaseTypeMapper {\n";
        mapper += "  protected map : { [type: string]: Loaders.TypeInfo } = {\n";
        allItemNames.forEach((x) => (mapper +=
            "    '" +
                x +
                "': {dataModel: '" +
                this.getModelInterfaceName(x) +
                "',instanceModel: '" +
                this.getModelInstanceName(x) +
                "'},\n"));
        mapper += "  }\n";
        mapper +=
            "  protected async doLoadType(typeInfo: Loaders.TypeInfo) : Promise<Taxonomy.IContentType> {\n";
        mapper += "    return import(\n";
        mapper += "    /* webpackInclude: /\\.ts$/ */\n";
        mapper += "    /* webpackExclude: /\\.noimport\\.ts$/ */\n";
        mapper += '    /* webpackChunkName: "types" */\n';
        mapper += '    /* webpackMode: "lazy-once" */\n';
        mapper += "    /* webpackPrefetch: true */\n";
        mapper += "    /* webpackPreload: false */\n";
        mapper += '    "./" + typeInfo.dataModel).then(exports => {\n';
        mapper += "      return exports[typeInfo.instanceModel];\n";
        mapper += "    }).catch(reason => {\n";
        mapper += "      if (Core.DefaultContext.isDebugActive()) {\n";
        mapper +=
            "        console.error(`Error while importing ${typeInfo.instanceModel} from ${typeInfo.dataModel} due to:`, reason);\n";
        mapper += "      }\n";
        mapper += "      return null;\n";
        mapper += "    });\n";
        mapper += "  }\n";
        mapper += "}\n";
        fs_1.default.writeFile(mapperFile, mapper, () => {
            console.log(" - Written type mapper");
        });
    }
    /**
     * Create a model file for the specified type
     *
     * @protected
     * @param {string}      typeName
     * @param {string[]}    allItemNames
     * @param {void}
     */
    createModelFile(typeName, allItemNames) {
        // console.log('   - Fetching model definition for '+typeName);
        const me = this;
        this._doRequest(this.getServiceUrl(typeName.guid)).then((info) => {
            if (!info)
                return;
            const interfaceName = me.getModelInterfaceName(info.name);
            const propsInterfaceName = me.getComponentPropertiesInterfaceName(info.name);
            const instanceName = me.getModelInstanceName(info.name);
            const fileName = interfaceName + ".ts";
            // Imports
            let iface = "import { ContentDelivery, Taxonomy, ComponentTypes } from '@episerver/spa-core'\n";
            // Heading
            iface +=
                "/**\n * " +
                    (info.displayName ? info.displayName : info.name) +
                    "\n *\n * " +
                    (info.description ? info.description : "No Description available.") +
                    "\n *\n * @GUID " +
                    info.guid +
                    "\n */\n";
            // Actual interface
            iface +=
                "export default interface " +
                    interfaceName +
                    " extends Taxonomy.IContent {\n";
            info.properties.forEach((prop) => {
                const propName = me.processFieldName(prop.name);
                if (!me._iContentProps.includes(propName)) {
                    iface +=
                        "    /**\n     * " +
                            (prop.displayName ? prop.displayName : prop.name) +
                            "\n     *\n     * " +
                            (prop.description
                                ? prop.description
                                : "No description available") +
                            "\n     */\n";
                    iface +=
                        "    " +
                            propName +
                            ": " +
                            me.ConvertTypeToSpaProperty(prop.type, allItemNames) +
                            "\n\n";
                    if (allItemNames.includes(prop.type)) {
                        iface =
                            "import " +
                                prop.type +
                                "Data from './" +
                                prop.type +
                                "Data'\n" +
                                iface;
                    }
                }
            });
            iface += "}\n\n";
            // Convenience interface
            iface +=
                "/**\n * Convenience interface for componentDidUpdate & componentDidMount methods.\n */\n";
            iface +=
                "export interface " +
                    propsInterfaceName +
                    " extends ComponentTypes.AbstractComponentProps<" +
                    interfaceName +
                    "> {}\n\n";
            // Instance type
            iface +=
                "export class " +
                    instanceName +
                    " extends Taxonomy.AbstractIContent<" +
                    interfaceName +
                    "> implements " +
                    interfaceName +
                    " {\n";
            iface += '    protected _typeName : string = "' + info.name + '";\n';
            iface +=
                "    /**\n     * Map of all property types within this content type.\n     */\n";
            iface +=
                "    protected _propertyMap : { [propName: string]: string } = {\n";
            info.properties.forEach((prop) => {
                const propName = me.processFieldName(prop.name);
                iface += "        '" + propName + "': '" + prop.type + "',\n";
            });
            iface += "    }\n\n";
            info.properties.forEach((prop) => {
                const propName = me.processFieldName(prop.name);
                if (!me._iContentProps.includes(propName)) {
                    iface +=
                        "    /**\n     * " +
                            (prop.displayName ? prop.displayName : prop.name) +
                            "\n     *\n     * " +
                            (prop.description
                                ? prop.description
                                : "No description available") +
                            "\n     */\n";
                    iface += `    public get ${propName}() : ${interfaceName}["${propName}"] { return this.getProperty("${propName}"); }\n\n`;
                }
            });
            iface += "}\n";
            // Write interface
            const fullTarget = path_1.default.join(me.getModelPath(), fileName);
            fs_1.default.writeFile(fullTarget, iface, () => {
                console.log("   - " + interfaceName + " written to " + fullTarget);
            });
        });
    }
    /**
     * Convert the reported model type to a TypeScript type
     *
     * @protected
     * @param {string}      typeName        The name of the type
     * @param {string[]}    allItemNames    The list of types in Episerver (for property blocks)
     * @returns {string}
     */
    ConvertTypeToSpaProperty(typeName, allItemNames) {
        switch (typeName) {
            case "Boolean":
                return "ContentDelivery.BooleanProperty";
            case "Decimal":
            case "Number":
            case "FloatNumber":
                return "ContentDelivery.NumberProperty";
            case "String":
            case "string":
            case "LongString":
            case "XhtmlString":
            case "Url":
                return "ContentDelivery.StringProperty";
            case "ContentReference":
            case "PageReference":
                return "ContentDelivery.ContentReferenceProperty";
            case "ContentReferenceList":
                return "ContentDelivery.ContentReferenceListProperty";
            case "ContentArea":
                return "ContentDelivery.ContentAreaProperty";
            case "LinkCollection":
                return "ContentDelivery.LinkListProperty";
            default:
                if (allItemNames.includes(typeName)) {
                    return typeName + "Data";
                }
                return "ContentDelivery.Property<any> // Original type: " + typeName;
        }
    }
    /**
     * Remove all models from the models folder, except thos explicitly kept
     *
     * @protected
     * @param {string[]} keep The model names to keep in the output folder
     */
    clearModels(keep) {
        console.log(" - Cleaning model directory");
        const modelPath = this.getModelPath();
        const files = fs_1.default.readdirSync(modelPath);
        files.forEach((file) => {
            const name = path_1.default.parse(file).name;
            if (name !== "TypeMapper" && keep && !keep.includes(name)) {
                console.log("  - Removing old model: ", name);
                fs_1.default.unlinkSync(path_1.default.join(modelPath, file));
            }
        });
    }
    /**
     * Build the service path within Episerver to fetch the model
     *
     * @protected
     * @param {string} modelName The name of the model
     * @returns {string}
     */
    getServiceUrl(modelName) {
        return this._servicePath + (modelName ? "/" + modelName : "");
    }
    /**
     * Get (and create if needed) the path where the models must be stored
     *
     * @protected
     * @returns {string}
     */
    getModelPath() {
        const modelDir = this._config.getEnvVariable("EPI_MODEL_PATH", this._modelDir);
        if (!modelDir) {
            throw new Error("Episerver models directory not set");
        }
        const modelPath = path_1.default.join(this._rootDir, modelDir);
        if (!fs_1.default.existsSync(modelPath)) {
            fs_1.default.mkdirSync(modelPath, { recursive: true });
        }
        return modelPath;
    }
    /**
     * Generate the TypeScript interface name
     *
     * @protected
     * @param {string} modelName    The name of the model in Episerver
     * @returns {string}
     */
    getModelInterfaceName(modelName) {
        return StringUtils.SafeModelName(modelName) + "Data";
    }
    /**
     * Generate the TypeScript instance name
     *
     * @protected
     * @param {string} modelName    The name of the model in Episerver
     * @returns {string}
     */
    getModelInstanceName(modelName) {
        return StringUtils.SafeModelName(modelName) + "Type";
    }
    /**
     * Generate the TypeScript interface name
     *
     * @protected
     * @param {string} modelName    The name of the model in Episerver
     * @return {string}
     */
    getComponentPropertiesInterfaceName(modelName) {
        return StringUtils.SafeModelName(modelName) + "Props";
    }
    processFieldName(originalName) {
        let processedName = originalName;
        processedName =
            processedName.charAt(0).toLowerCase() + processedName.slice(1);
        return processedName;
    }
    _doRequest(url) {
        return this._api
            .raw(url, { method: "get" }, false)
            .then((r) => (isNetworkErrorResponse(r[0]) ? null : r[0]))
            .catch((e) => {
            console.error(`\n\n\x1b[31m  !!! Error while fetching ${url}: ${(e === null || e === void 0 ? void 0 : e.message) || e} !!!\x1b[0m`);
            return null;
        });
    }
}
exports.EpiModelSync = EpiModelSync;
exports.default = EpiModelSync;
