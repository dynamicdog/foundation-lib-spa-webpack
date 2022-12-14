"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientAuthStorage = void 0;
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Implementation of a basic file storage for the authentication data
 * for interacting with Episerver
 *
 * @implements { epi.ContentDelivery.IAuthStorage }
 */
class ClientAuthStorage {
    static CreateFromUrl(u) {
        const hash = crypto_1.default.createHash('sha256');
        hash.update(u.host);
        return new ClientAuthStorage(hash.digest('hex'));
    }
    /**
     *
     * @param {string} [scope] The scope for the file name
     */
    constructor(scope) {
        /**
         * The filename where the authorization token will be stored
         *
         * @private
         * @constant
         * @readonly
         * @type { string }
         */
        this.AUTH_FILE = '.epi_auth';
        /**
         * The path to the homedir of the current user
         *
         * @private
         * @type { string }
         */
        this._homeDir = '';
        this._filePostFix = '';
        this._homeDir = os_1.default.homedir();
        this._filePostFix = scope || '';
    }
    /**
     * @returns { boolean }
     */
    clearToken() {
        if (!this.isStorageFilePathUsable)
            return false;
        try {
            fs_1.default.unlinkSync(this.getStorageFilePath());
            return true;
        }
        catch (e) {
            return false;
        }
    }
    /**
     *
     * @param { epi.ContentDelivery.IOAuthSuccessResponse } token The token to store
     * @returns { boolean }
     */
    storeToken(token) {
        if (!this.isStorageFilePathUsable)
            return false;
        try {
            const data = Buffer.from(JSON.stringify(token));
            fs_1.default.writeFileSync(this.getStorageFilePath(), data.toString('base64'));
            return true;
        }
        catch (e) {
            console.log(e);
            return false;
        }
    }
    /**
     * @returns { boolean }
     */
    hasToken() {
        return this.getToken() !== null;
    }
    /**
     * @returns { epi.ContentDelivery.IOAuthSuccessResponse | null }
     */
    getToken() {
        if (!this.isStorageFilePathUsable)
            return null;
        try {
            const reader = Buffer.from(fs_1.default.readFileSync(this.getStorageFilePath(), { encoding: 'ascii' }), 'base64');
            return JSON.parse(reader.toString('ascii'));
        }
        catch (e) {
            return null;
        }
    }
    /**
     *
     * @protected
     * @returns { string }
     */
    getStorageFilePath() {
        if (this._filePostFix && typeof (this._filePostFix) === 'string' && this._filePostFix.length > 0)
            return path_1.default.join(this._homeDir, '.' + this._filePostFix + this.AUTH_FILE);
        else
            return path_1.default.join(this._homeDir, this.AUTH_FILE);
    }
    /**
     *
     * @protected
     * @returns {boolean}
     */
    isStorageFilePathUsable() {
        const storagePath = this.getStorageFilePath();
        const exists = (storagePath) => {
            try {
                const stats = fs_1.default.statSync(storagePath);
                if (stats.isFile()) {
                    return true;
                }
            }
            catch (e) {
                return false;
            }
            throw new Error('Auth file exists but is not of type file');
        };
        const isWriteable = (path) => {
            try {
                fs_1.default.accessSync(path, fs_1.default.constants.F_OK | fs_1.default.constants.R_OK | fs_1.default.constants.W_OK);
                return true;
            }
            catch (e) {
                return false;
            }
        };
        return exists(storagePath) ? isWriteable(storagePath) : isWriteable(path_1.default.dirname(storagePath));
    }
}
exports.ClientAuthStorage = ClientAuthStorage;
exports.default = ClientAuthStorage;
