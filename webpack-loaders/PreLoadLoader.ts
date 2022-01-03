import loaderUtils, {
  OptionObject,
  Readonly as ReadonlyOptions,
} from "loader-utils";
import { validate as validateOptions } from "schema-utils";
import glob from "glob";
import path from "path";
import { Schema } from "schema-utils/declarations/validate";

const schema: Schema = {
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

type PreLoadConfig = OptionObject & {
  pattern: string;
  extension: string;
  exclude?: string;
};

/**
 * Find and replace the @PreLoad annotation within a
 * TypeScript file to automatically create a pre-load
 * of normally dynamically loaded modules.
 *
 * @param   {string}    source  The source prepared by Webpack
 * @returns {string}    The source with the injected preloading code
 */
function PreLoadLoader(source: string): string {
  // @ts-ignore: This is controlled by Webpack so allowing usage here
  const loaderContext: any = this;
  const options: ReadonlyOptions<PreLoadConfig> = loaderUtils.getOptions(
    loaderContext
  ) as ReadonlyOptions<PreLoadConfig>;
  validateOptions(schema, options, { name: "PreLoad loader" });
  var test = /\@PreLoad\("(.*)"\,"(.*)"\,"(.*)"\)/;
  var matches = source.match(test);
  if (matches) {
    console.log("Found @PreLoad annotation in: " + loaderContext?.resourcePath);

    //Context
    const toReplace = matches[0];
    const component_path = matches[1];
    const variable = matches[2];
    const component_prefix = matches[3];
    const component_dir = path.resolve(loaderContext.context, component_path);
    const files = glob.sync(component_dir + "/" + options.pattern, {
      ignore: ["**/*.stories.tsx", "**/*.styles.tsx", "**/*.style.tsx"],
    });

    //Debug
    console.log("  - Search pattern: " + component_dir + "/" + options.pattern);
    console.log("  - Variable: " + variable);
    console.log("  - Component prefix: " + component_prefix);

    //Start building script
    const script: string[] = [];
    const script_end: string[] = [];
    if (!variable.includes(".")) {
      // Declare the global variable if there's no scope provided
      console.log("  - Injecting TypeScript variable declaration");
      script.push("declare var " + variable + ": any;");
    }
    script.push(
      "try { " +
        variable +
        " = " +
        variable +
        " || {}; } catch (e) { " +
        variable +
        " = {}; }\n"
    );

    //Handle components
    files.forEach(
      function (file: string) {
        // 1. Get the name of the module from the file
        const module_name = path.basename(file, options.extension);
        // 2. Get the path of the module, relative to the starting point (making sure we use a forward slash as delimiter)
        const module_path = path
          .relative(component_dir, path.dirname(file))
          .replace(/[\\]/gi, "/");
        // 3. Build the full import path used to import the module
        const module_import =
          component_prefix +
          (module_path ? module_path + "/" : "") +
          module_name;
        // 4. Create the variable name
        const module_varname = module_path.replace(/[\/]/gi, "") + module_name;
        // 5. Push the needed lines of code
        script.push(
          "import " + module_varname + " from '" + module_import + "';"
        );
        script_end.push(
          variable + '["' + module_import + '"] = ' + module_varname + ";"
        );
      }.bind(loaderContext)
    );

    const inject =
      [
        "// Start: Injected PreLoad script",
        script.join("\n"),
        script_end.join("\n"),
        "// End: Injected PreLoad script",
      ].join("\n") + "\n";
    const newSource = source.replace(toReplace, inject);
    console.log(
      "  - Injected " + files.length + " modules into " + variable + "\n"
    );
    return newSource;
  }

  return source;
}

module.exports = PreLoadLoader;
