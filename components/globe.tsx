"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";

// Define regex at top level for performance
const HEX_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

// Helper function to convert hex color to RGB array
function hexToRgb(hex: string): [number, number, number] {
  const result = HEX_REGEX.exec(hex);
  return result
    ? [
        Number.parseInt(result[1], 16) / 255,
        Number.parseInt(result[2], 16) / 255,
        Number.parseInt(result[3], 16) / 255,
      ]
    : [0, 0, 0];
}

// Use type instead of interface
type GlobeProps = {
  className?: string;
  width?: number;
  height?: number;
  speed?: number;
  opacity?: number;
  backgroundColor?: string;
  globeColor?: string;
  markerColor?: string;
  glowColor?: string; // Add glowColor prop
};

export function Globe({
  className = "",
  width = 700,
  height = 700,
  speed = 0.005,
  opacity = 1,
  backgroundColor = "transparent",
  globeColor = "#41627c",
  markerColor = "#FACE74",
  glowColor = "#41627c",
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const rotationSpeed = useRef(speed);
  const phi = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    // Set canvas size explicitly
    canvas.width = width * 2;
    canvas.height = height * 2;

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: height * 2,
      phi: 0,
      theta: 0,
      dark: 1,
      scale: 1,
      diffuse: 0.74,
      opacity, // Use shorthand syntax
      mapSamples: 13_000, // Add numeric separators
      mapBrightness: 5,
      baseColor: hexToRgb(globeColor),
      markerColor: hexToRgb(markerColor),
      glowColor: hexToRgb(glowColor), // Apply hex to RGB conversion
      markers: [
        { location: [34.0549, -118.2426], size: 0.07 }, // Los Angeles (North, West)
        { location: [-22.9068, -43.1729], size: 0.05 }, // Rio de Janeiro (South, West)
        { location: [40.7128, -74.006], size: 0.05 }, // New York (North, West)
        { location: [38.7223, -9.1393], size: 0.05 }, // Lisbon (North, West)
        { location: [51.5074, -0.1278], size: 0.05 }, // London (North, West)
        { location: [48.8566, 2.3522], size: 0.05 }, // Paris (North, West)
        { location: [47.3769, 8.5417], size: 0.05 }, // Zurich (North, East)
        { location: [41.8967, 12.4822], size: 0.05 }, // Rome (North, East)
        { location: [30.0444, 31.2357], size: 0.07 }, // Cairo (North, East)
        { location: [55.7569, 37.6151], size: 0.05 }, // Moscow (North, East)
        { location: [-26.2056, 28.0337], size: 0.05 }, // Johannesburg (South, East)
        { location: [28.6139, 77.2088], size: 0.07 }, // New Delhi (North, East)
        { location: [39.9042, 116.4074], size: 0.07 }, // Beijing (North, East)
        { location: [35.6895, 139.6917], size: 0.05 }, // Tokyo (North, West)
      ],
      onRender: (state) => {
        // Called on every animation frame.
        // `state` will be an empty object, return updated params.
        phi.current += rotationSpeed.current;
        state.phi = phi.current;
        state.theta = 0;

        if (pointerInteracting.current !== null) {
          // User is interacting with the globe
          rotationSpeed.current = 0;
          state.phi =
            pointerInteractionMovement.current / 200 +
            (pointerInteracting.current - width / 2) / 800;
        } else {
          // Auto-rotation when not interacting
          rotationSpeed.current = speed;
        }
        
        state.width = width * 2;
        state.height = height * 2;
      },
    });

    // Mouse/touch interaction handlers
    const onPointerDown = (e: PointerEvent) => {
      pointerInteracting.current = e.clientX;
      pointerInteractionMovement.current = 0;
      canvas.style.cursor = "grabbing";
    };

    const onPointerUp = () => {
      pointerInteracting.current = null;
      canvas.style.cursor = "grab";
    };

    const onPointerOut = () => {
      pointerInteracting.current = null;
      canvas.style.cursor = "grab";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        const delta = e.clientX - pointerInteracting.current;
        pointerInteractionMovement.current = delta;
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointerout", onPointerOut);
    canvas.addEventListener("pointermove", onPointerMove);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerout", onPointerOut);
      canvas.removeEventListener("pointermove", onPointerMove);
      globe.destroy();
    };
  }, [opacity, speed, globeColor, markerColor, glowColor, width, height]); // Remove backgroundColor from dependencies

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab"
        style={{
          width,
          height,
          contain: "layout style size",
          opacity,
          background: backgroundColor,
          margin: "auto",
          display: "block",
        }}
      />
    </div>
  );
}