import { LaunchArt } from "@/components/LaunchArt";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Launch art", undefined, true);

// The page the launch pictures are photographed from. It sits over everything, the turn-your-phone notice included.
export default function LaunchArtPage() {
  return (
    <>
      {/* Keeps the developer badge out of the photograph. */}
      <style>{"nextjs-portal { display: none; }"}</style>
      <LaunchArt className="fixed inset-0 z-[120] flex" />
    </>
  );
}
