#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs_1 = require("fs");
const path_1 = require("path");
const node_fetch_1 = tslib_1.__importDefault(require("node-fetch"));
const zod_1 = require("zod");
const yargs_1 = tslib_1.__importDefault(require("yargs"));
const openapi_typescript_1 = tslib_1.__importDefault(require("openapi-typescript"));
const Argv = zod_1.z.object({
    host: zod_1.z.string(),
    email: zod_1.z.string(),
    password: zod_1.z.string(),
    appTypeName: zod_1.z.string().optional(),
    directusTypeName: zod_1.z.string().optional(),
    allTypeName: zod_1.z.string().optional(),
    specOutFile: zod_1.z.string().nullish(),
    outFile: zod_1.z.string(),
});
const main = async () => {
    const argv = Argv.parse(await (0, yargs_1.default)(process.argv.slice(2))
        .option(`host`, { demandOption: true, type: `string` })
        .option(`email`, { demandOption: true, type: `string` })
        .option(`password`, { demandOption: true, type: `string` })
        .option(`appTypeName`, {
        alias: `typeName`,
        demandOption: false,
        type: `string`,
        default: `AppCollections`,
    })
        .option(`directusTypeName`, {
        demandOption: false,
        type: `string`,
        default: `DirectusCollections`,
    })
        .option(`allTypeName`, {
        demandOption: false,
        type: `string`,
        default: `Collections`,
    })
        .option(`specOutFile`, { demandOption: false, type: `string` })
        .option(`outFile`, { demandOption: true, type: `string` })
        .help().argv);
    const { host, email, password, appTypeName: appCollectionsTypeName, directusTypeName: directusCollectionsTypeName, allTypeName: allCollectionsTypeName, specOutFile, outFile, } = argv;
    const { data: { access_token: token }, } = (await (await (0, node_fetch_1.default)(new URL(`/auth/login`, host).href, {
        method: `post`,
        body: JSON.stringify({ email, password, mode: `json` }),
        headers: {
            "Content-Type": `application/json`,
        },
    })).json());
    const spec = (await (await (0, node_fetch_1.default)(`${host}/server/specs/oas`, {
        method: `get`,
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })).json());
    if (specOutFile) {
        await fs_1.promises.writeFile((0, path_1.resolve)(process.cwd(), specOutFile), JSON.stringify(spec, null, 2), {
            encoding: `utf-8`,
        });
    }
    const baseSource = (0, openapi_typescript_1.default)(spec);
    const exportUserCollectionsProperties = [];
    const exportDirectusCollectionsProperties = [];
    for (const [schemaKey, schema] of Object.entries(spec.components.schemas)) {
        const collectionId = schema[`x-collection`];
        const line = `  ${collectionId}: components["schemas"]["${schemaKey}"];`;
        const isUserCollection = schemaKey.startsWith(`Items`);
        (isUserCollection
            ? exportUserCollectionsProperties
            : exportDirectusCollectionsProperties).push(line);
    }
    const exportUserCollectionsType = `export type ${appCollectionsTypeName} = {\n${exportUserCollectionsProperties.join(`\n`)}\n};\n`;
    const exportDirectusCollectionsType = `export type ${directusCollectionsTypeName} = {\n${exportDirectusCollectionsProperties.join(`\n`)}\n};\n`;
    const exportAllCollectionsType = `export type ${allCollectionsTypeName} = ${directusCollectionsTypeName} & ${appCollectionsTypeName};\n`;
    const source = [
        baseSource,
        exportUserCollectionsType,
        exportDirectusCollectionsType,
        exportAllCollectionsType,
    ].join(`\n`);
    await fs_1.promises.writeFile((0, path_1.resolve)(process.cwd(), outFile), source, {
        encoding: `utf-8`,
    });
};
if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
else {
    throw new Error(`This should be the main module.`);
}
//# sourceMappingURL=cli.js.map