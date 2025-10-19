"use client";

import { useState, useEffect } from "react";
import { updateChatVisibility } from "@/app/(chat)/actions";
import type { VisibilityType } from "@/components/visibility-selector";
import { getLocalChat } from "@/lib/local-db";

export function useChatVisibility({
  chatId,
  initialVisibilityType,
}: {
  chatId: string;
  initialVisibilityType: VisibilityType;
}) {
  const [visibilityType, setVisibilityType] = useState<VisibilityType>(initialVisibilityType);
  const [loading, setLoading] = useState(false);

  // Fetch current visibility type from IndexedDB
  useEffect(() => {
    const fetchVisibility = async () => {
      if (!chatId) return;
      
      try {
        const chat = await getLocalChat(chatId);
        if (chat && chat.visibility) {
          setVisibilityType(chat.visibility);
        }
      } catch (error) {
        console.error("Error fetching chat visibility:", error);
      }
    };

    fetchVisibility();
  }, [chatId]);

  const updateVisibilityType = async (updatedVisibilityType: VisibilityType) => {
    setLoading(true);
    try {
      // Update in IndexedDB
      await updateChatVisibility({
        chatId,
        visibility: updatedVisibilityType,
      });
      
      // Update local state
      setVisibilityType(updatedVisibilityType);
      
      // Dispatch a custom event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('chatVisibilityUpdated', {
          detail: { chatId, visibility: updatedVisibilityType }
        }));
      }
    } catch (error) {
      console.error("Error updating chat visibility:", error);
    } finally {
      setLoading(false);
    }
  };

  return { 
    visibilityType, 
    setVisibilityType: updateVisibilityType,
    loading 
  };
}