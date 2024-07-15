import {glob} from "glob";
import fsPromise from "fs/promises";
import path from "path";
import {fetch, ProxyAgent, RequestInfo as FetchRequestInfo, RequestInit as FetchRequestInit} from "undici";
import fs from "fs";
import {getMySQLDump, getPostgresDump} from "./sql";

export async function getAllFilesPathByPattern(pattern: string): Promise<string[]> {
    const files = await glob(pattern, {nodir: false});

    const absolutePaths = await Promise.all(files.map(async (file) => {
        const stats = await fsPromise.stat(file);
        if (stats.isFile()) {
            return path.resolve(file);
        } else if (stats.isDirectory()) {
            const nestedFiles = await glob(path.join(file, '**/*'), {nodir: true});
            return nestedFiles.map(nestedFile => path.resolve(nestedFile));
        }
    }));

    return absolutePaths.flat().filter(s => s != undefined) as string[];
}

export async function getFilesContent(targets: string[]) {
    let contents: string[] = [];
    for (let target of targets) {
        const files = await getAllFilesPathByPattern(target);

        for (let file of files) {
            const content = await fs.promises.readFile(path.resolve(file), 'utf-8');
            contents.push(`//${file}\n${content}`);
        }
    }
    return contents;
}

export function getFetcher(opts?: {proxyUrl: string}) {
    return async (input: RequestInfo, init?: RequestInit) => {
        if (!init) init = {};
        const dispatcher = opts?.proxyUrl ? new ProxyAgent(opts.proxyUrl) : undefined;
        const response = await fetch(input as FetchRequestInfo, {
            ...init,
            dispatcher: dispatcher,
        } as FetchRequestInit);

        return response;
    }
}

export async function getDBSchema(url: string) {
    if (url.startsWith('postgres://')) {
        return getPostgresDump(url);
    } else if (url.startsWith('mysql://')) {
        return getMySQLDump(url);
    } else {
        return undefined
    }
}
