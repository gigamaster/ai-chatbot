import { z } from "zod";
import { artifactKinds, documentHandlersByArtifactKind } from "@/lib/artifacts/document-handlers";
import { createDocumentHandler } from "@/lib/artifacts/document-handler";
import type { ArtifactKind } from "@/components/artifact";
import type { UIMessageStreamWriter } from "@/lib/custom-ai";
import type { CustomUIDataTypes } from "@/lib/types";
import type { Document } from "../local-db";
import { saveLocalDocumentById } from "../local-db-queries";

// Define the UserType type that was previously in the auth.ts file
type UserType = "regular";

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

// artifactKinds is now imported from document-handlers.ts

// createDocumentHandler is now imported from document-handler.ts

export type SaveDocumentProps = {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
};

export type CreateDocumentCallbackProps = {
  id: string;
  title: string;
  dataStream: UIMessageStreamWriter<CustomUIDataTypes>;
  session: LocalSession;
};

export type UpdateDocumentCallbackProps = {
  document: Document;
  description: string;
  dataStream: UIMessageStreamWriter<CustomUIDataTypes>;
  session: LocalSession;
};

// Handle document creation
export async function createDocumentCallback({
  id,
  title,
  dataStream,
  session,
}: CreateDocumentCallbackProps) {
  const { user } = session;

  // Save the document to the local database
  const document = await saveLocalDocumentById({
    id,
    title,
    content: "",
    kind: "text",
    userId: user.id,
  });

  // Send the document properties to the client
  dataStream.write({
    type: "data-id",
    data: document.id,
  });
  dataStream.write({
    type: "data-title",
    data: document.title,
  });
  dataStream.write({
    type: "data-kind",
    data: document.kind,
  });
}

// Handle document updates
export async function updateDocumentCallback({
  document,
  description,
  dataStream,
  session,
}: UpdateDocumentCallbackProps) {
  const { user } = session;

  // Update the document in the local database
  const updatedDocument = await saveLocalDocumentById({
    id: document.id,
    title: document.title,
    content: description,
    kind: document.kind,
    userId: user.id,
  });

  // Send the updated document properties to the client
  dataStream.write({
    type: "data-id",
    data: updatedDocument.id,
  });
  dataStream.write({
    type: "data-title",
    data: updatedDocument.title,
  });
  dataStream.write({
    type: "data-kind",
    data: updatedDocument.kind,
  });
}

// documentHandlersByArtifactKind is now imported from document-handlers.ts