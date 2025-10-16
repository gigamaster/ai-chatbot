import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { ChatMessage } from "@/lib/types";

// Define the UserType type that was previously in the auth.ts file
type UserType = "guest" | "regular";

// Define a local session type that matches our local authentication system
// and is compatible with the expected Session interface
type LocalUser = {
  id: string;
  email: string;
  type: UserType;
  name?: string;
  image?: string;
};

type LocalSession = {
  user: LocalUser;
  expires: string; // Required by the expected Session interface
};

type DebugCodeProps = {
  session: LocalSession;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const debugCode = ({ session, dataStream }: DebugCodeProps) =>
  tool({
    description: "Debug code snippets by identifying and explaining errors. Provides suggestions for fixing issues.",
    inputSchema: z.object({
      code: z.string().describe("The code to debug"),
      language: z.string().describe("The programming language of the code (e.g., 'javascript', 'python', 'java')"),
      error: z.string().optional().describe("The error message, if any"),
    }),
    execute: async ({ code, language, error }) => {
      // In a real implementation, this would analyze the code and provide debugging assistance
      // For now, we'll simulate debugging with a placeholder response
      
      dataStream.write({
        type: "data-debug-start",
        data: { language, code, error },
        transient: true,
      });

      // Simulate debugging analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate debugging result
      const result = {
        issues: [
          {
            type: "potential-issue",
            description: "Potential issue identified in the code",
            line: 5,
            suggestion: "Consider adding error handling for this operation"
          }
        ],
        explanation: `Analysis of ${language} code complete. ${error ? `Error: ${error}. ` : ''}See issues panel for details.`,
        success: true,
      };

      dataStream.write({
        type: "data-debug-result",
        data: result,
        transient: true,
      });

      return {
        message: `Code debugging complete for ${language}. Check the debugging panel for issues and suggestions.`,
        issues: result.issues,
        explanation: result.explanation,
      };
    },
  });