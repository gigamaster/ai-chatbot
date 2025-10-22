"use client";

import { useEffect, useRef } from "react";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";
// Use a relative import with the correct path
import { useDataStream } from "@/components/data-stream-provider";

export function DataStreamHandler() {
  const { dataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    for (const delta of newDeltas) {
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifact.kind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      // Create a properly typed update function
      const updateArtifact = (currentArtifact: any) => {
        if (!currentArtifact) {
          return { ...initialArtifactData, status: "streaming" as const };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...currentArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case "data-title":
            return {
              ...currentArtifact,
              title: delta.data,
              status: "streaming",
            };

          case "data-kind":
            return {
              ...currentArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...currentArtifact,
              content: "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...currentArtifact,
              status: "idle",
            };

          default:
            return currentArtifact;
        }
      };

      // Type assertion to match the expected signature
      setArtifact(updateArtifact as any);
    }
  }, [dataStream, setArtifact, setMetadata, artifact]);

  return null;
}