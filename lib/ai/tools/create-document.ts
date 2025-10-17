import { tool, type UIMessageStreamWriter } from "@/lib/custom-ai";
import { z } from "zod";
import {
  artifactKinds,
} from "@/lib/artifacts/server";
import { generateUUID } from "@/lib/utils";

export const createDocument = () =>
  tool({
    name: "createDocument",
    description:
      "Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.",
    parameters: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async (args: { title: string; kind: string }) => {
      const { title, kind } = args;
      const id = generateUUID();

      // Since our custom tool implementation is a mock, we'll just return a mock response
      return {
        id,
        title,
        kind,
        content: "A document was created and is now visible to the user.",
      };
    },
  });
