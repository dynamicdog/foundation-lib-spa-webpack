export declare class EpiEnvOptions {
    static Development: Readonly<EpiEnvOption>;
    static Integration: Readonly<EpiEnvOption>;
    static Preproduction: Readonly<EpiEnvOption>;
    static Production: Readonly<EpiEnvOption>;
    /**
     * Convert a string to one of the constants of this class.
     *
     * @param   { string }  strValue
     * @returns { EpiEnvOptions | undefined }
     */
    static Parse<T extends EpiEnvOption | undefined>(strValue: string, defaultValue: T): Readonly<EpiEnvOption | T>;
}
export type EpiEnvOption = "development" | "integration" | "preproduction" | "production";
export default EpiEnvOptions;
