"use client";
import equal from "fast-deep-equal";
import { motion } from "framer-motion";
import { memo, useState } from "react";
import type { Vote } from "@/lib/local-db";
import type { ChatMessage } from "@/lib/types";
import { cn, sanitizeText } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import { DocumentToolResult } from "./document";
import { DocumentPreview } from "./document-preview";
import { MessageContent } from "./elements/message";
import { Response } from "./elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "./elements/tool";
import { SparklesIcon } from "./icons";
import { MessageActions } from "./message-actions";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: any;
  regenerate: any;
  isReadonly: boolean;
  requiresScrollPadding: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === "file"
  );

  useDataStream();

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="group/message w-full"
      data-role={message.role}
      data-testid={`message-${message.role}`}
      initial={{ opacity: 0 }}
    >
      <div
        className={cn("flex w-full items-start gap-2 md:gap-3", {
          "justify-end": message.role === "user" && mode !== "edit",
          "justify-start": message.role === "assistant",
        })}
      >
        {message.role === "assistant" && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div
          className={cn("flex flex-col", {
            "gap-2 md:gap-4": message.parts?.some(
              (p) => p.type === "text" && p.text?.trim()
            ),
            "min-h-96": message.role === "assistant" && requiresScrollPadding,
            "w-full":
              (message.role === "assistant" &&
                message.parts?.some(
                  (p) => p.type === "text" && p.text?.trim()
                )) ||
              mode === "edit",
            "max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]":
              message.role === "user" && mode !== "edit",
          })}
        >
          {attachmentsFromMessage.length > 0 && (
            <div
              className="flex flex-row justify-end gap-2"
              data-testid={"message-attachments"}
            >
              {attachmentsFromMessage.map((attachment) => (
                <PreviewAttachment
                  attachment={{
                    name: (attachment as any).filename ?? "file",
                    contentType: (attachment as any).mediaType,
                    url: attachment.url,
                  }}
                  key={attachment.url}
                />
              ))}
            </div>
          )}

          {message.parts?.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

            if (type === "reasoning" && (part as any).text?.trim().length > 0) {
              return (
                <MessageReasoning
                  isLoading={isLoading}
                  key={key}
                  reasoning={(part as any).text}
                />
              );
            }

            if (type === "text") {
              if (mode === "view") {
                return (
                  <div key={key}>
                    <MessageContent
                      className={cn({
                        "w-fit break-words rounded-2xl px-3 py-2 text-right text-white":
                          message.role === "user",
                        "bg-transparent px-0 py-0 text-left":
                          message.role === "assistant",
                      })}
                      data-testid="message-content"
                      style={
                        message.role === "user"
                          ? { backgroundColor: "#006cff" }
                          : undefined
                      }
                    >
                      <Response>{sanitizeText(part.text)}</Response>
                    </MessageContent>
                  </div>
                );
              }

              if (mode === "edit") {
                return (
                  <div
                    className="flex w-full flex-row items-start gap-3"
                    key={key}
                  >
                    <div className="size-8" />
                    <div className="min-w-0 flex-1">
                      <MessageEditor
                        key={message.id}
                        message={message}
                        regenerate={regenerate}
                        setMessages={setMessages}
                        setMode={setMode}
                      />
                    </div>
                  </div>
                );
              }
            }

            if (type === "tool-getWeather") {
              const { toolCallId, state } = part as any;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-getWeather" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={(part as any).input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={undefined}
                        output={<Weather weatherAtLocation={(part as any).output} />}
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-createDocument") {
              const { toolCallId } = part as any;

              if ((part as any).output && "error" in (part as any).output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error creating document: {String((part as any).output.error)}
                  </div>
                );
              }

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state="output-available" type="tool-createDocument" />
                  <ToolContent>
                    <ToolOutput
                      errorText={undefined}
                      output={
                        <DocumentToolResult
                          documentId={(part as any).output.id}
                          kind={(part as any).output.kind}
                          title={(part as any).output.title}
                        />
                      }
                    />
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-updateDocument") {
              const { toolCallId } = part as any;

              if ((part as any).output && "error" in (part as any).output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error updating document: {String((part as any).output.error)}
                  </div>
                );
              }

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader
                    state="output-available"
                    type="tool-updateDocument"
                  />
                  <ToolContent>
                    <ToolOutput
                      errorText={undefined}
                      output={
                        <DocumentPreview
                          args={{ ...(part as any).output, isUpdate: true }}
                          result={(part as any).output}
                        />
                      }
                    />
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-requestSuggestions") {
              const { toolCallId } = part as any;

              if ((part as any).output && "error" in (part as any).output) {
                return (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-500 dark:bg-red-950/50"
                    key={toolCallId}
                  >
                    Error requesting suggestions:{" "}
                    {String((part as any).output.error)}
                  </div>
                );
              }

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader
                    state="output-available"
                    type="tool-requestSuggestions"
                  />
                  <ToolContent>
                    <ToolOutput
                      errorText={undefined}
                      output={
                        <DocumentPreview
                          args={(part as any).output}
                          result={(part as any).output}
                        />
                      }
                    />
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-debugCode") {
              const { toolCallId, state } = part as any;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-debugCode" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={(part as any).input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={
                          (part as any).output?.success === false
                            ? (part as any).output?.explanation
                            : undefined
                        }
                        output={
                          <div className="flex flex-col gap-2">
                            <div className="font-medium">
                              {(part as any).output?.explanation}
                            </div>
                            <div className="flex flex-col gap-1">
                              {(part as any).output?.issues?.map(
                                (issue: any, index: number) => (
                                  <div
                                    className="flex flex-row items-start gap-2 text-sm"
                                    key={index}
                                  >
                                    <div
                                      className={cn(
                                        "font-medium",
                                        issue.type === "error"
                                          ? "text-red-500"
                                          : "text-yellow-500"
                                      )}
                                    >
                                      {issue.type === "error"
                                        ? "Error"
                                        : "Warning"}
                                      :
                                    </div>
                                    <div>{issue.description}</div>
                                    {issue.line && (
                                      <div className="text-muted-foreground">
                                        (line {issue.line})
                                      </div>
                                    )}
                                    {issue.suggestion && (
                                      <div className="text-muted-foreground">
                                        Suggestion: {issue.suggestion}
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            if (type === "tool-executeCode") {
              const { toolCallId, state } = part as any;

              return (
                <Tool defaultOpen={true} key={toolCallId}>
                  <ToolHeader state={state} type="tool-executeCode" />
                  <ToolContent>
                    {state === "input-available" && (
                      <ToolInput input={(part as any).input} />
                    )}
                    {state === "output-available" && (
                      <ToolOutput
                        errorText={
                          (part as any).output?.success === false
                            ? (part as any).output?.output
                            : undefined
                        }
                        output={
                          <div className="flex flex-col gap-2">
                            <div className="font-medium">
                              Execution completed in{" "}
                              {(part as any).output?.executionTime}ms
                            </div>
                            <pre className="max-w-full overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                              {(part as any).output?.output}
                            </pre>
                          </div>
                        }
                      />
                    )}
                  </ToolContent>
                </Tool>
              );
            }

            return null;
          })}

          {message.role === "assistant" && (
            <MessageActions
              chatId={chatId}
              isReadonly={isReadonly}
              message={message}
              regenerate={regenerate}
              setMode={setMode}
              vote={vote}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const PreviewMessage = memo(PurePreviewMessage, (prevProps, nextProps) => {
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }
  if (!equal(prevProps.message, nextProps.message)) {
    return false;
  }
  if (!equal(prevProps.vote, nextProps.vote)) {
    return false;
  }

  return true;
});

export function ThinkingMessage() {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex w-full items-start gap-3"
      initial={{ opacity: 0 }}
    >
      <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
        <SparklesIcon size={14} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-2 w-32 animate-pulse rounded-full bg-muted-foreground/20" />
        <div className="h-2 w-24 animate-pulse rounded-full bg-muted-foreground/20" />
      </div>
    </motion.div>
  );
}