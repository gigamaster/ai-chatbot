import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Globe } from "@/components/globe";

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center p-4">
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <Globe
          backgroundColor="transparent"
          className=""
          globeColor="#41627c"
          glowColor="#ffffff"
          height={700}
          markerColor="#FACE74"
          opacity={0.74}
          speed={0.005}
          width={700}
        />
      </div>

      <div className="relative z-10 max-w-md text-center">
        <h1 className="mb-4 font-bold text-6xl">404</h1>
        <h2 className="mb-4 font-semibold text-3xl">Page Not Found</h2>
        <p className="mb-8 text-muted-foreground">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Button asChild>
            <Link href="/">Go to Home</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">View Settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
