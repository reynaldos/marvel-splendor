// Makes the launch pictures in public/launch: a photograph of the /launch-art
// page at every screen in data/launch-screens.json. The art is for a phone on
// its side; the picture for a phone held upright is the same one turned a
// quarter, so it reads as "turn me". Run by hand,
// with the dev server running, when the art or the list of screens changes:
//   pnpm launch:images [http://localhost:3000]
// Needs Google Chrome and macOS's `sips`.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "public/launch";
const page = `${process.argv[2] ?? "http://localhost:3000"}/launch-art`;

const found = await fetch(page).catch(() => null);
if (!found?.ok) {
  console.error(`Nothing at ${page}. Start the dev server, or pass its address.`);
  process.exit(1);
}

const { screens } = JSON.parse(readFileSync("data/launch-screens.json", "utf8"));
mkdirSync(OUT, { recursive: true });

const sips = (...args) => execFileSync("sips", args, { stdio: "ignore" });
const report = (file) => console.log(`${file}  ${Math.round(statSync(file).size / 1024)} KB`);

for (const [width, height, scale] of screens) {
  const onItsSide = `${OUT}/${height * scale}x${width * scale}`;
  const upright = `${OUT}/${width * scale}x${height * scale}.jpg`;
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--force-device-scale-factor=${scale}`,
      `--window-size=${height},${width}`,
      "--virtual-time-budget=10000",
      `--screenshot=${onItsSide}.png`,
      page,
    ],
    { stdio: "ignore" },
  );
  sips("-s", "format", "jpeg", "-s", "formatOptions", "80", `${onItsSide}.png`, "--out", `${onItsSide}.jpg`);
  rmSync(`${onItsSide}.png`);
  sips("-r", "90", `${onItsSide}.jpg`, "--out", upright);
  report(`${onItsSide}.jpg`);
  report(upright);
}
