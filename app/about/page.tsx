import { AboutScreen } from "@/components/about/AboutScreen";
import { TopBar } from "@/components/TopBar";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("About", "Who made Marvel Splendor, what it keeps about you, and the terms of play.");

// Open to anyone, signed in or not: the policies have to be readable before signing in.
export default function AboutPage() {
  return (
    <>
      <TopBar />
      <AboutScreen />
    </>
  );
}
