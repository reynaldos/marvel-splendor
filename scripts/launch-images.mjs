// Makes the launch pictures in public/launch: a photograph of the /launch-art
// page at every screen in data/launch-screens.json, each way up. Run by hand,
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

for (const [width, height, scale] of screens) {
  for (const [across, down] of [[width, height], [height, width]]) {
    const name = `${OUT}/${across * scale}x${down * scale}`;
    // Chrome won't open a window narrower than 500, so a narrow screen is
    // drawn at twice the size and half the sharpness: the same picture.
    const zoom = across < 500 ? 2 : 1;
    execFileSync(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        `--force-device-scale-factor=${scale / zoom}`,
        `--window-size=${across * zoom},${down * zoom}`,
        "--virtual-time-budget=10000",
        `--screenshot=${name}.png`,
        page,
      ],
      { stdio: "ignore" },
    );
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "80", `${name}.png`, "--out", `${name}.jpg`], {
      stdio: "ignore",
    });
    rmSync(`${name}.png`);
    console.log(`${name}.jpg  ${Math.round(statSync(`${name}.jpg`).size / 1024)} KB`);
  }
}
