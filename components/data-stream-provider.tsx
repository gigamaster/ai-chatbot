"use client";

import type React from "react";
import { createContext, useMemo, useState } from "react";
import type { DataUIPart } from "@/lib/custom-ai";
import type { CustomUIDataTypes } from "@/lib/types";

// Simple replacement for the data stream provider that returns empty data
// This avoids breaking components that were calling useDataStream() but not using it

type DataStreamContextValue = {
  dataStream: DataUIPart<CustomUIDataTypes>[];
  setDataStream: React.Dispatch<
    React.SetStateAction<DataUIPart<CustomUIDataTypes>[]>
  >;
};

const DataStreamContext = createContext<DataStreamContextValue | null>(null);

export function DataStreamProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dataStream, setDataStream] = useState<DataUIPart<CustomUIDataTypes>[]>(
    []
  );

  const value = useMemo(() => ({ dataStream, setDataStream }), [dataStream]);

  return (
    <DataStreamContext.Provider value={value}>
      {children}
    </DataStreamContext.Provider>
  );
}

// Simple hook that returns empty data to avoid breaking existing components
export function useDataStream() {
  return {
    dataStream: [] as DataUIPart<CustomUIDataTypes>[],
    setDataStream: (() => {
      // Empty implementation for placeholder data stream
    }) as React.Dispatch<React.SetStateAction<DataUIPart<CustomUIDataTypes>[]>>,
  };
}
