import { NextResponse } from 'next/server';
import { 
  saveLocalChat, 
  getLocalChat, 
  deleteLocalChat, 
  getAllLocalChats,
  saveLocalMessages,
  getLocalMessages,
  saveLocalDocument,
  getLocalDocument,
  saveLocalFile,
  getLocalFile,
  saveLocalSuggestions,
  getLocalSuggestions,
  saveLocalVote,
  getLocalVotes,
  saveLocalUser,
  getLocalUser,
  getLocalUserByEmail
} from '@/lib/local-db';

// Helper function to handle errors
function handleError(error: any, message: string) {
  console.error(message, error);
  return NextResponse.json(
    { error: message, details: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  );
}

// POST - Handle various database operations based on operation type
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation, data } = body;

    switch (operation) {
      // User operations
      case 'createUser':
        const newUser = await saveLocalUser(data);
        return NextResponse.json({ user: newUser });
      
      case 'getUserByEmail':
        const userByEmail = await getLocalUserByEmail(data.email);
        return NextResponse.json({ user: userByEmail });
      
      case 'getUser':
        const user = await getLocalUser(data.id);
        return NextResponse.json({ user });
      
      // Chat operations
      case 'saveChat':
        const savedChat = await saveLocalChat(data);
        return NextResponse.json({ chat: savedChat });
      
      case 'deleteChat':
        const deleted = await deleteLocalChat(data.id);
        return NextResponse.json({ success: deleted });
      
      case 'deleteAllChatsByUser':
        const userChats = await getAllLocalChats(data.userId);
        let deletedCount = 0;
        for (const chat of userChats) {
          const result = await deleteLocalChat(chat.id);
          if (result) deletedCount++;
        }
        return NextResponse.json({ deletedCount });
      
      // Message operations
      case 'saveMessages':
        const messagesSaved = await saveLocalMessages(data.chatId, data.messages);
        return NextResponse.json({ success: messagesSaved });
      
      // Vote operations
      case 'saveVote':
        const savedVote = await saveLocalVote(data);
        return NextResponse.json({ vote: savedVote });
      
      // Document operations
      case 'saveDocument':
        const savedDocument = await saveLocalDocument(data);
        return NextResponse.json({ document: savedDocument });
      
      // File operations
      case 'saveFile':
        const savedFile = await saveLocalFile(data);
        return NextResponse.json({ file: savedFile });
      
      // Suggestion operations
      case 'saveSuggestions':
        const suggestionsSaved = await saveLocalSuggestions(data.suggestions);
        return NextResponse.json({ success: suggestionsSaved });
      
      default:
        return NextResponse.json(
          { error: 'Unknown operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleError(error, 'Failed to process database operation');
  }
}

// GET - Handle retrieval operations
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');
    const params = Object.fromEntries(searchParams.entries());
    
    // Remove operation from params
    delete params.operation;

    switch (operation) {
      // User operations
      case 'getUser':
        const user = await getLocalUser(params.id);
        return NextResponse.json({ user });
      
      case 'getUserByEmail':
        const userByEmail = await getLocalUserByEmail(params.email);
        return NextResponse.json({ user: userByEmail });
      
      // Chat operations
      case 'getChat':
        const chat = await getLocalChat(params.id);
        return NextResponse.json({ chat });
      
      case 'getChatsByUser':
        const chats = await getAllLocalChats(params.userId);
        // Apply sorting and pagination if needed
        let sortedChats = chats;
        if (params.sort === 'createdAt') {
          sortedChats = chats.sort((a: any, b: any) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        
        // Apply pagination
        if (params.limit) {
          const limit = parseInt(params.limit);
          const offset = params.offset ? parseInt(params.offset) : 0;
          sortedChats = sortedChats.slice(offset, offset + limit);
        }
        
        return NextResponse.json({ chats: sortedChats });
      
      // Message operations
      case 'getMessages':
        const messages = await getLocalMessages(params.chatId);
        return NextResponse.json({ messages });
      
      // Vote operations
      case 'getVotes':
        const votes = await getLocalVotes(params.chatId);
        return NextResponse.json({ votes });
      
      // Document operations
      case 'getDocument':
        const document = await getLocalDocument(params.id);
        return NextResponse.json({ document });
      
      // File operations
      case 'getFile':
        const file = await getLocalFile(params.id);
        return NextResponse.json({ file });
      
      // Suggestion operations
      case 'getSuggestions':
        const suggestions = await getLocalSuggestions(params.documentId);
        return NextResponse.json({ suggestions });
      
      default:
        return NextResponse.json(
          { error: 'Unknown operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleError(error, 'Failed to retrieve data');
  }
}

// DELETE - Handle deletion operations
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');
    const params = Object.fromEntries(searchParams.entries());
    
    // Remove operation from params
    delete params.operation;

    switch (operation) {
      case 'deleteChat':
        const deleted = await deleteLocalChat(params.id);
        return NextResponse.json({ success: deleted });
      
      case 'deleteAllChatsByUser':
        const userChats = await getAllLocalChats(params.userId);
        let deletedCount = 0;
        for (const chat of userChats) {
          const result = await deleteLocalChat(chat.id);
          if (result) deletedCount++;
        }
        return NextResponse.json({ deletedCount });
      
      default:
        return NextResponse.json(
          { error: 'Unknown operation' },
          { status: 400 }
        );
    }
  } catch (error) {
    return handleError(error, 'Failed to delete data');
  }
}