import { z } from "zod";
import { tool } from "@/lib/custom-ai";

export const executeCode = () =>
  tool({
    name: "executeCode",
    description:
      "Execute code snippets and return the output. Supports JavaScript, Python, and other languages.",
    parameters: z.object({
      code: z.string().describe("The code to execute"),
      language: z
        .string()
        .describe(
          "The programming language of the code (e.g., 'javascript', 'python', 'java')"
        ),
    }),
    execute: async (args: { code: string; language: string }) => {
      const { code, language } = args;

      // Since our custom tool implementation is a mock, we'll just return a mock response
      return {
        message: `Code executed in ${language}. Check the output in the code execution panel.`,
        result: `Code executed successfully in ${language}.\nOutput: [Execution result would appear here]`,
      };
    },
  });
