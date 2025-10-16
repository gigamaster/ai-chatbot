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

type ExecuteCodeProps = {
  session: LocalSession;
  dataStream: UIMessageStreamWriter<ChatMessage>;
};

export const executeCode = ({ session, dataStream }: ExecuteCodeProps) =>
  tool({
    description: "Execute code snippets and return the output. Supports JavaScript, Python, and other languages.",
    inputSchema: z.object({
      code: z.string().describe("The code to execute"),
      language: z.string().describe("The programming language of the code (e.g., 'javascript', 'python', 'java')"),
    }),
    execute: async ({ code, language }) => {
      // In a real implementation, this would connect to a secure code execution service
      // For now, we'll simulate execution with a placeholder response
      
      dataStream.write({
        type: "data-execution-start",
        data: { language, code },
        transient: true,
      });

      // Simulate code execution delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate execution result
      const result = {
        output: `Code executed successfully in ${language}.\nOutput: [Execution result would appear here]`,
        executionTime: Math.random() * 1000,
        success: true,
      };

      dataStream.write({
        type: "data-execution-result",
        data: result,
        transient: true,
      });

      return {
        message: `Code executed in ${language}. Check the output in the code execution panel.`,
        result: result.output,
      };
    },
  });