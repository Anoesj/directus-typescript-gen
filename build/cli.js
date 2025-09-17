#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import yargs from "yargs";
import openApiTs from "openapi-typescript";
const Argv = z.object({
    host: z.string(),
    email: z.string(),
    password: z.string(),
    passwordIsStaticToken: z.boolean(),
    appTypeName: z.string(),
    directusTypeName: z.string(),
    allTypeName: z.string(),
    specOutFile: z.string().nullish(),
    outFile: z.string(),
});
const argv = Argv.parse(await yargs(process.argv.slice(2))
    .option(`host`, { demandOption: true, type: `string` })
    .option(`email`, { demandOption: true, type: `string` })
    .option(`password`, { demandOption: true, type: `string` })
    .option(`passwordIsStaticToken`, {
    demandOption: false,
    type: `boolean`,
    default: false,
})
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
const { host, email, password, passwordIsStaticToken, appTypeName: appCollectionsTypeName, directusTypeName: directusCollectionsTypeName, allTypeName: allCollectionsTypeName, specOutFile, outFile, } = argv;
let token;
if (passwordIsStaticToken) {
    token = password;
}
else {
    const response = await fetch(new URL(`/auth/login`, host).href, {
        method: `post`,
        body: JSON.stringify({ email, password, mode: `json` }),
        headers: {
            "Content-Type": `application/json`,
        },
    });
    const json = await response.json();
    token = json.data.access_token;
}
const spec = (await (await fetch(`${host}/server/specs/oas`, {
    method: `get`,
    headers: {
        Authorization: `Bearer ${token}`,
    },
})).json());
function assertSpecHasNoErrors(spec) {
    if ('errors' in spec && spec.errors.length) {
        console.error(spec.errors);
        throw new Error('Could not generate TypeScript definitions');
    }
}
assertSpecHasNoErrors(spec);
if (specOutFile) {
    await writeFile(resolve(process.cwd(), specOutFile), JSON.stringify(spec, null, 2), {
        encoding: `utf-8`,
    });
}
const baseSource = await openApiTs(spec);
const exportUserCollectionsProperties = [];
const exportDirectusCollectionsProperties = [];
for (const [schemaKey, schema] of Object.entries(spec.components.schemas)) {
    const collectionId = schema[`x-collection`];
    if (typeof collectionId !== 'string' || !collectionId) {
        continue;
    }
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
await writeFile(resolve(process.cwd(), outFile), source, {
    encoding: `utf-8`,
});
//# sourceMappingURL=cli.js.map