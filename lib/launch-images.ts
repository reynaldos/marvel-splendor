import launchScreens from "@/data/launch-screens.json";

/**
 * The launch pictures an installed iPhone app chooses from. An iPhone only
 * shows one made for its exact screen, so there is one per screen, each way up.
 */
export const LAUNCH_IMAGES = launchScreens.screens.flatMap(([width, height, scale]) =>
  (["landscape", "portrait"] as const).map((orientation) => {
    const [across, down] = orientation === "portrait" ? [width, height] : [height, width];
    return {
      url: `/launch/${across * scale}x${down * scale}.jpg`,
      media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${scale}) and (orientation: ${orientation})`,
    };
  }),
);
