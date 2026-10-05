export type ConversationType = 'direct' | 'group';

export type DirectConversation = {
  id: string;
  type: 'direct';
  participants: [string, string];
  createdAt: number;
};

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type MessageStatus = 'sent' | 'sending' | 'failed';

/** Mensagem exibida na tela: persistida no RTDB ou pendente/falha local. */
export type DisplayMessage = ChatMessage & {
  status: MessageStatus;
};

export type SendMessageInput = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

/** Item da lista de conversas (individual ou grupo). */
export type ConversationSummary = {
  id: string;
  type: ConversationType;
  title: string;
  photoUrl: string;
  subtitle: string;
  updatedAt: number;
};
