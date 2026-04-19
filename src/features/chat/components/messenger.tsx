'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import type { Attachment, Conversation } from '../utils/types';
import { ChatArea } from './chat-area';
import { ConversationList } from './conversation-list';
import { ConversationSelect } from './conversation-select';

export function Messenger() {
  const conversationsQuery = useQuery(api.conversations.list, {});
  const conversations = useMemo(() => conversationsQuery ?? [], [conversationsQuery]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const sendMessage = useMutation(api.conversations.sendMessage);
  const markRead = useMutation(api.conversations.markRead);

  useEffect(() => {
    if (!selectedConversationId && conversations[0]?.id) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    setAttachments([]);
  }, [selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  const messages = useQuery(
    api.conversations.getMessages,
    selectedConversationId
      ? { conversationId: selectedConversationId as Id<'conversations'> }
      : 'skip'
  );

  const activeConversation: Conversation | undefined = useMemo(() => {
    if (!selectedConversation) return undefined;

    return {
      ...selectedConversation,
      messages: messages ?? selectedConversation.messages
    };
  }, [messages, selectedConversation]);

  const selectConversation = useCallback(
    (id: string) => {
      setSelectedConversationId(id);
      void markRead({ conversationId: id as Id<'conversations'> });
    },
    [markRead]
  );

  const handleAddAttachments = useCallback((files: FileList) => {
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: file.name,
      size: file.size,
      type: file.type
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!selectedConversationId) return;
      if (!draft.trim() && attachments.length === 0) return;

      await sendMessage({
        conversationId: selectedConversationId as Id<'conversations'>,
        text: draft,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      setDraft('');
      setAttachments([]);
    },
    [attachments, draft, selectedConversationId, sendMessage]
  );

  if (!activeConversation) {
    return (
      <div className='border-border/50 bg-background/70 flex h-[calc(100dvh-5.5rem)] items-center justify-center rounded-2xl border p-6 text-sm text-muted-foreground backdrop-blur-xl'>
        Loading conversations...
      </div>
    );
  }

  return (
    <div className='border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:30%_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5'>
      <ConversationSelect
        conversations={conversations}
        selectedId={selectedConversationId}
        onSelect={selectConversation}
      />
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversationId}
        onSelect={selectConversation}
      />
      <ChatArea
        conversation={activeConversation}
        draft={draft}
        onDraftChange={setDraft}
        onSubmit={handleSubmit}
        attachments={attachments}
        onAddAttachments={handleAddAttachments}
        onRemoveAttachment={handleRemoveAttachment}
      />
    </div>
  );
}
