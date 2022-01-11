import fs from "fs";
import os from "os";
import path from "path";
import { URL } from "url";

const EOL = os.EOL

// Import from Spa Core
import { Services, ContentDelivery } from "@episerver/spa-core";
const StringUtils = Services.String;

// Import from webpack
import GlobalConfig from "../util/Config";
import ClientAuthStorage from "../ContentDelivery/ClientAuthStorage";

// Definitions
export type TypeOverviewResponse = TypeDefinition[];
export type TypeDefinition = {
  name: string;
  displayName: string;
  description: string;
  guid: string;
};
export type TypeDefinitionData = TypeDefinition & {
  properties: {
    name: string;
    displayName: string;
    description: string;
    type: string;
  }[];
};

type internalAuthService = ContentDelivery.IAuthService &
  ContentDelivery.IAuthTokenProvider;
function isNetworkErrorResponse(
  toTest: unknown
): toTest is ContentDelivery.NetworkErrorData {
  if (!toTest) return false;
  if (typeof toTest !== "object") return false;
  return (toTest as ContentDelivery.NetworkErrorData).error &&
    (toTest as ContentDelivery.NetworkErrorData).contentType
    ? true
    : false;
}

/**
 * Episerver Model Synchronization Job
 */
export class EpiModelSync {
  protected _modelDir: Readonly<string> = "src/Models/Episerver";
  protected _servicePath: Readonly<string> = "api/episerver/v3/model";
  protected _rootDir: string;
  protected _config: GlobalConfig;
  protected _iContentProps: string[] = ["contentLink"];
  protected _api: ContentDelivery.IContentDeliveryAPI_V2;
  protected _auth: internalAuthService;

  /**
   * Create a new instance of the job
   *
   * @param {string} spaDir      The directory where the SPA is located
   * @param {string} envDir      The environment directory to use as configuration source, if different from the spaDir
   */
  public constructor(config: GlobalConfig) {
    this._config = config;
    this._rootDir = config.getRootDir();

    // Configure Episerver Connection
    const u = new URL(this._config.getEpiserverURL());
    this._api = new ContentDelivery.API_V2({
      BaseURL: u.href,
      Debug: false,
      EnableExtensions: true,
    });
    this._auth = new ContentDelivery.DefaultAuthService(
      this._api,
      ClientAuthStorage.CreateFromUrl(u)
    ) as internalAuthService;
    this._api.TokenProvider = this._auth;
  }

  /**
   * Run the configuration job
   */
  public run(): void {
    console.log("***** Start: Episerver IContent Model Synchronization *****");
    console.log(" - Using Episerver installed at: " + this._api.BaseURL);
    this._auth.currentUser().then((u) => {
      if (u) console.log(` - Authenticated as ${u}`);
      else console.log(" - Using an unauthenticated connections");
    });
    console.log(
      " - Ensuring models directory exists (" + this.getModelPath() + ")"
    );
    console.log(" - Retrieving content types");
    const me = this;
    this._doRequest<TypeOverviewResponse>(this.getServiceUrl())
      .then((r) => {
        if (!r) return;
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
  protected createAsyncTypeMapper(allItemNames: string[]): void {
    const mapperFile = path.join(this.getModelPath(), "TypeMapper.ts");
    let mapper =
      `import { Taxonomy, Core, Loaders } from '@episerver/spa-core';${EOL}`;
    // allItemNames.forEach(x => mapper += "import {"+this.getModelInstanceName(x)+"} from './"+ this.getModelInterfaceName(x)+`';${EOL}`)
    mapper +=
      `${EOL}export default class TypeMapper extends Loaders.BaseTypeMapper {${EOL}`;
    mapper += `  protected map : { [type: string]: Loaders.TypeInfo } = {${EOL}`;
    allItemNames.forEach(
      (x) =>
        (mapper +=
          "    '" +
          x +
          "': {dataModel: '" +
          this.getModelInterfaceName(x) +
          "',instanceModel: '" +
          this.getModelInstanceName(x) +
          `'},${EOL}`)
    );
    mapper += `  }${EOL}`;

    mapper +=
      `  protected async doLoadType(typeInfo: Loaders.TypeInfo) : Promise<Taxonomy.IContentType> {${EOL}`;
    mapper += `    return import(${EOL}`;
    mapper += `    /* webpackInclude: /\\.ts$/ */${EOL}`;
    mapper += `    /* webpackExclude: /\\.noimport\\.ts$/ */${EOL}`;
    mapper += `    /* webpackChunkName: "types" */${EOL}`;
    mapper += `    /* webpackMode: "lazy-once" */${EOL}`;
    mapper += `    /* webpackPrefetch: true */${EOL}`;
    mapper += `    /* webpackPreload: false */${EOL}`;
    mapper += `    "./" + typeInfo.dataModel).then(exports => {${EOL}`;
    mapper += `      return exports[typeInfo.instanceModel];${EOL}`;
    mapper += `    }).catch(reason => {${EOL}`;
    mapper += `      if (Core.DefaultContext.isDebugActive()) {${EOL}`;
    mapper +=
      `        console.error(\`Error while importing \${typeInfo.instanceModel} from \${typeInfo.dataModel} due to:\`, reason);${EOL}`;
    mapper += `      }${EOL}`;
    mapper += `      return null;${EOL}`;
    mapper += `    });${EOL}`;
    mapper += `  }${EOL}`;

    mapper += `}${EOL}`;

    fs.writeFile(mapperFile, mapper, () => {
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
  protected createModelFile(
    typeName: TypeDefinition,
    allItemNames: string[]
  ): void {
    // console.log('   - Fetching model definition for '+typeName);
    const me = this;
    this._doRequest<TypeDefinitionData>(this.getServiceUrl(typeName.guid)).then(
      (info) => {
        if (!info) return;
        const interfaceName = me.getModelInterfaceName(info.name);
        const propsInterfaceName = me.getComponentPropertiesInterfaceName(
          info.name
        );
        const instanceName = me.getModelInstanceName(info.name);
        const fileName = interfaceName + ".ts";

        // Imports
        let iface =
          `import { ContentDelivery, Taxonomy, ComponentTypes } from '@episerver/spa-core'${EOL}`;

        // Heading
        iface +=
          `/**${EOL} * ` +
          (info.displayName ? info.displayName : info.name) +
          `${EOL} *${EOL} * ` +
          (info.description ? info.description : "No Description available.") +
          `${EOL} *${EOL} * @GUID ` +
          info.guid +
          `${EOL} */${EOL}`;

        // Actual interface
        iface +=
          "export default interface " +
          interfaceName +
          ` extends Taxonomy.IContent {${EOL}`;
        info.properties.forEach((prop) => {
          const propName = me.processFieldName(prop.name);
          if (!me._iContentProps.includes(propName)) {
            iface +=
              `    /**${EOL}     * ` +
              (prop.displayName ? prop.displayName : prop.name) +
              `${EOL}     *${EOL}     * ` +
              (prop.description
                ? prop.description
                : "No description available") +
              `${EOL}     */${EOL}`;
            iface +=
              "    " +
              propName +
              ": " +
              me.ConvertTypeToSpaProperty(prop.type, allItemNames) +
              `${EOL}${EOL}`;

            if (allItemNames.includes(prop.type)) {
              iface =
                "import " +
                prop.type +
                "Data from './" +
                prop.type +
                `Data'${EOL}` +
                iface;
            }
          }
        });
        iface += `}${EOL}${EOL}`;

        // Convenience interface
        iface +=
          `/**${EOL} * Convenience interface for componentDidUpdate & componentDidMount methods.${EOL} */${EOL}`;
        iface +=
          "export interface " +
          propsInterfaceName +
          " extends ComponentTypes.AbstractComponentProps<" +
          interfaceName +
          `> {}${EOL}${EOL}`;

        // Instance type
        iface +=
          "export class " +
          instanceName +
          " extends Taxonomy.AbstractIContent<" +
          interfaceName +
          "> implements " +
          interfaceName +
          ` {${EOL}`;
        iface += '    protected _typeName : string = "' + info.name + `";${EOL}`;
        iface +=
          `    /**${EOL}     * Map of all property types within this content type.${EOL}     */${EOL}`;
        iface +=
          `    protected _propertyMap : { [propName: string]: string } = {${EOL}`;
        info.properties.forEach((prop) => {
          const propName = me.processFieldName(prop.name);
          iface += "        '" + propName + "': '" + prop.type + `',${EOL}`;
        });
        iface += `    }${EOL}${EOL}`;
        info.properties.forEach((prop) => {
          const propName = me.processFieldName(prop.name);
          if (!me._iContentProps.includes(propName)) {
            iface +=
              `    /**${EOL}     * ` +
              (prop.displayName ? prop.displayName : prop.name) +
              `${EOL}     *${EOL}     * ` +
              (prop.description
                ? prop.description
                : "No description available") +
              `${EOL}     */${EOL}`;
            iface += `    public get ${propName}() : ${interfaceName}["${propName}"] { return this.getProperty("${propName}"); }${EOL}${EOL}`;
          }
        });
        iface += `}${EOL}`;

        // Write interface
        const fullTarget = path.join(me.getModelPath(), fileName);
        fs.writeFile(fullTarget, iface, () => {
          console.log("   - " + interfaceName + " written to " + fullTarget);
        });
      }
    );
  }

  /**
   * Convert the reported model type to a TypeScript type
   *
   * @protected
   * @param {string}      typeName        The name of the type
   * @param {string[]}    allItemNames    The list of types in Episerver (for property blocks)
   * @returns {string}
   */
  protected ConvertTypeToSpaProperty(
    typeName: string,
    allItemNames: string[]
  ): string {
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
  protected clearModels(keep: string[]): void {
    console.log(" - Cleaning model directory");
    const modelPath = this.getModelPath();
    const files = fs.readdirSync(modelPath);
    files.forEach((file) => {
      const name = path.parse(file).name;
      if (name !== "TypeMapper" && keep && !keep.includes(name)) {
        console.log("  - Removing old model: ", name);
        fs.unlinkSync(path.join(modelPath, file));
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
  protected getServiceUrl(modelName?: string): string {
    return this._servicePath + (modelName ? "/" + modelName : "");
  }

  /**
   * Get (and create if needed) the path where the models must be stored
   *
   * @protected
   * @returns {string}
   */
  protected getModelPath(): string {
    const modelDir = this._config.getEnvVariable(
      "EPI_MODEL_PATH",
      this._modelDir
    );
    if (!modelDir) {
      throw new Error("Episerver models directory not set");
    }
    const modelPath = path.join(this._rootDir, modelDir);
    if (!fs.existsSync(modelPath)) {
      fs.mkdirSync(modelPath, { recursive: true });
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
  protected getModelInterfaceName(modelName: string): string {
    return StringUtils.SafeModelName(modelName) + "Data";
  }

  /**
   * Generate the TypeScript instance name
   *
   * @protected
   * @param {string} modelName    The name of the model in Episerver
   * @returns {string}
   */
  protected getModelInstanceName(modelName: string): string {
    return StringUtils.SafeModelName(modelName) + "Type";
  }

  /**
   * Generate the TypeScript interface name
   *
   * @protected
   * @param {string} modelName    The name of the model in Episerver
   * @return {string}
   */
  protected getComponentPropertiesInterfaceName(modelName: string): string {
    return StringUtils.SafeModelName(modelName) + "Props";
  }

  protected processFieldName(originalName: string): string {
    let processedName = originalName;
    processedName =
      processedName.charAt(0).toLowerCase() + processedName.slice(1);
    return processedName;
  }

  protected _doRequest<T = any>(url: string): Promise<T | null> {
    return this._api
      .raw<T>(url, { method: "get" }, false)
      .then((r) => (isNetworkErrorResponse(r[0]) ? null : r[0]))
      .catch((e) => {
        console.error(
          `${EOL}${EOL}\x1b[31m  !!! Error while fetching ${url}: ${
            e?.message || e
          } !!!\x1b[0m`
        );
        return null;
      });
  }
}

export default EpiModelSync;
