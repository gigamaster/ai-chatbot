import { z } from "zod";
import { tool } from "@/lib/custom-ai";

export const debugCode = () =>
  tool({
    name: "debugCode",
    description:
      "Debug code snippets by identifying and explaining errors. Provides suggestions for fixing issues.",
    parameters: z.object({
      code: z.string().describe("The code to debug"),
      language: z
        .string()
        .describe(
          "The programming language of the code (e.g., 'javascript', 'python', 'java')"
        ),
      error: z.string().optional().describe("The error message, if any"),
    }),
    execute: async (args: {
      code: string;
      language: string;
      error?: string;
    }) => {
      const { code, language, error } = args;

      // Since our custom tool implementation is a mock, we'll just return a mock response
      return {
        message: `Code debugging complete for ${language}. Check the debugging panel for issues and suggestions.`,
        issues: [
          {
            type: "potential-issue",
            description: "Potential issue identified in the code",
            line: 5,
            suggestion: "Consider adding error handling for this operation",
          },
        ],
        explanation: `Analysis of ${language} code complete. ${error ? `Error: ${error}. ` : ""}See issues panel for details.`,
      };
    },
  });
