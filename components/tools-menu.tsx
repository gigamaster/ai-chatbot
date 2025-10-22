"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, CodeIcon } from "./icons";

export function ToolsMenu({ className }: React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className
        )}
      >
        <Button
          className="hidden h-8 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 md:flex md:h-fit md:px-2"
          data-testid="tools-menu"
          variant="outline"
        >
          <CodeIcon />
          <span className="md:sr-only">Tools</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[300px]">
        <DropdownMenuItem asChild>
          <Link
            className="flex flex-col items-start gap-1"
            href="https://gigamaster.github.io/livecodes/"
            target="_blank"
          >
            <span>Live Code Editor</span>
            <div className="text-muted-foreground text-xs">
              Interactive coding environment
            </div>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            className="flex flex-col items-start gap-1"
            href="https://gigamaster.github.io/codemo"
            target="_blank"
          >
            <span>Codemo Digital Nomad</span>
            <div className="text-muted-foreground text-xs">
              Tools for digital nomads
            </div>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
