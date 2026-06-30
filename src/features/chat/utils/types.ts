export type Attachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type Message = {
  id: string;
  sender: 'user' | 'contact';
  author: string;
  authorUserId?: string;
  authorEmail?: string;
  text: string;
  timestamp: string;
  attachments?: Attachment[];
};

export type ConversationStatus = 'online' | 'offline';

export type StaffMember = {
  userId: string;
  email: string;
  name: string;
  role: string;
  status: string;
};

export type Conversation = {
  id: string;
  name: string;
  title: string;
  status: ConversationStatus;
  unread: number;
  initials: string;
  messages: Message[];
  quickReplies: string[];
  autoReplies?: string[];
};
