// Define the Experimental_GeneratedImage type since we don't have it in our custom AI package
type Experimental_GeneratedImage = {
  base64: string;
  uint8Array?: Uint8Array;
  mediaType: string;
};

import { cn } from "@/lib/utils";

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
};

export const Image = ({
  base64,
  uint8Array,
  mediaType,
  ...props
}: ImageProps) => (
  // biome-ignore lint/nursery/useImageSize: "Generated image without explicit size"
  // biome-ignore lint/performance/noImgElement: "Generated image without explicit size"
  <img
    {...props}
    alt={props.alt}
    className={cn(
      "h-auto max-w-full overflow-hidden rounded-md",
      props.className
    )}
    src={`data:${mediaType};base64,${base64}`}
  />
);