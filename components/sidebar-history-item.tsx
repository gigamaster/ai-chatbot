import Link from "next/link";
import { memo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { Chat } from "@/lib/local-db";
import { DownloadIcon, MoreHorizontalIcon, TrashIcon } from "./icons";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  // Handle chat export
  const handleExport = async (format: "json" | "markdown" | "text" | "zip") => {
    try {
      // Import the export functions dynamically
      const exportService = await import("@/lib/chat-export-service");

      // Get messages for this chat
      const { getLocalMessagesByChatId } = await import(
        "@/lib/local-db-queries"
      );
      const messages = await getLocalMessagesByChatId({ id: chat.id });

      // Convert messages to UI format
      const { convertToUIMessages } = await import("@/lib/utils");
      const uiMessages = convertToUIMessages(messages);

      // Export the chat
      if (format === "zip") {
        await exportService.exportChatAsZip(chat, uiMessages);
      } else {
        exportService.exportChat(chat, uiMessages, format);
      }
    } catch (error) {
      console.error("Error exporting chat:", error);
      // TODO: Show error to user
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
          <span>{chat.title}</span>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="mr-0.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            showOnHover={!isActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <DownloadIcon />
              <span>Download</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => handleExport("json")}
                >
                  <div className="flex flex-row items-center gap-2">
                    <span>JSON</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => handleExport("markdown")}
                >
                  <div className="flex flex-row items-center gap-2">
                    <span>Markdown</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => handleExport("text")}
                >
                  <div className="flex flex-row items-center gap-2">
                    <span>Plain Text</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer flex-row justify-between"
                  onClick={() => handleExport("zip")}
                >
                  <div className="flex flex-row items-center gap-2">
                    <span>ZIP Archive</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => onDelete(chat.id)}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  return true;
});
