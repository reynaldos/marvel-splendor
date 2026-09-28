// Writes data/image-versions.json: a short fingerprint of every picture in
// public/cards and public/assets. The app adds it to each picture's address,
// so a picture that changes gets a new address and is fetched afresh, while
// the rest stay cached. Runs before `dev` and `build`.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const FOLDERS = ["cards", "assets"];
const OUT = "data/image-versions.json";

const versions = {};
for (const folder of FOLDERS) {
  for (const entry of readdirSync(path.join("public", folder), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    const file = path.join(entry.parentPath, entry.name);
    const url = "/" + path.relative("public", file).split(path.sep).join("/");
    versions[url] = createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 8);
  }
}

const sorted = Object.fromEntries(Object.entries(versions).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + "\n");
console.log(`${OUT}: ${Object.keys(sorted).length} pictures`);
