export = EmptyLoader;

/**
 * Small helper to ensure certain files are loaded empty by WebPack to optimize
 * delivery across different channels
 * 
 * @param source The source loaded by WebPack
 * @returns      An empty string
 */
declare function EmptyLoader (source: string): string;