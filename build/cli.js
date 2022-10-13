#!/usr/bin/env node
import { promises } from "fs";
import { resolve } from "path";
import fetch from "node-fetch";
import { z } from "zod";
import yargs from "yargs";
import openApiTs from "openapi-typescript";
const Argv = z.object({
    host: z.string(),
    email: z.string(),
    password: z.string(),
    appTypeName: z.string().optional(),
    directusTypeName: z.string().optional(),
    allTypeName: z.string().optional(),
    specOutFile: z.string().nullish(),
    outFile: z.string(),
});
const argv = Argv.parse(await yargs(process.argv.slice(2))
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
const { data: { access_token: token }, } = (await (await fetch(new URL(`/auth/login`, host).href, {
    method: `post`,
    body: JSON.stringify({ email, password, mode: `json` }),
    headers: {
        "Content-Type": `application/json`,
    },
})).json());
const spec = (await (await fetch(`${host}/server/specs/oas`, {
    method: `get`,
    headers: {
        Authorization: `Bearer ${token}`,
    },
})).json());
if (specOutFile) {
    await promises.writeFile(resolve(process.cwd(), specOutFile), JSON.stringify(spec, null, 2), {
        encoding: `utf-8`,
    });
}
const baseSource = await openApiTs(spec);
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
await promises.writeFile(resolve(process.cwd(), outFile), source, {
    encoding: `utf-8`,
});
//# sourceMappingURL=cli.js.map