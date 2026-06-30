'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import type { Attachment, Conversation, StaffMember } from '../utils/types';
import { ChatArea } from './chat-area';
import { ConversationList } from './conversation-list';
import { ConversationSelect } from './conversation-select';

export function Messenger() {
  const { isLoaded, organization } = useOrganization();
  const { user } = useUser();
  const conversationsQuery = useQuery(api.conversations.list, {});
  const conversations = useMemo(() => conversationsQuery ?? [], [conversationsQuery]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [startingMemberId, setStartingMemberId] = useState<string | null>(null);
  const sendMessage = useMutation(api.conversations.sendMessage);
  const markRead = useMutation(api.conversations.markRead);
  const startConversation = useMutation(api.conversations.startConversation);

  useEffect(() => {
    if (!isLoaded) return;

    const orgId = organization?.id;
    if (!orgId) {
      setMembers([]);
      setMembersLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      try {
        setMembersLoading(true);
        const response = await fetch(
          `/api/chat-members?orgId=${encodeURIComponent(orgId as string)}`,
          {
            cache: 'no-store',
            credentials: 'same-origin'
          }
        );

        if (!response.ok) {
          throw new Error('Unable to load school staff members.');
        }

        const result = (await response.json()) as { members?: StaffMember[] };
        if (!cancelled) {
          setMembers(result.members ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setMembers([]);
          toast.error(
            error instanceof Error ? error.message : 'Unable to load school staff members'
          );
        }
      } finally {
        if (!cancelled) {
          setMembersLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, organization?.id]);

  useEffect(() => {
    if (!selectedConversationId && conversations[0]?.id) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (
      selectedConversationId &&
      !conversations.some((conversation) => conversation.id === selectedConversationId)
    ) {
      setSelectedConversationId(conversations[0]?.id ?? '');
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

    const viewerUserId = user?.id;
    const viewerEmails = [
      user?.primaryEmailAddress?.emailAddress,
      user?.emailAddresses?.[0]?.emailAddress
    ]
      .map((value) => value?.trim().toLowerCase())
      .filter(Boolean);
    const normalizedMessages = (messages ?? selectedConversation.messages).map((message) => {
      if (message.authorUserId) {
        return {
          ...message,
          sender: message.authorUserId === viewerUserId ? ('user' as const) : ('contact' as const)
        };
      }

      if (message.authorEmail) {
        return {
          ...message,
          sender: viewerEmails.includes(message.authorEmail.trim().toLowerCase())
            ? ('user' as const)
            : ('contact' as const)
        };
      }

      if (message.author === 'You') {
        return { ...message, sender: 'user' as const };
      }

      return message;
    });

    return {
      ...selectedConversation,
      messages: normalizedMessages
    };
  }, [messages, selectedConversation, user]);

  const selectConversation = useCallback(
    (id: string) => {
      setSelectedConversationId(id);
      void markRead({ conversationId: id as Id<'conversations'> });
    },
    [markRead]
  );

  const handleStartConversation = useCallback(
    async (member: StaffMember) => {
      const orgId = organization?.id;
      if (!orgId) {
        toast.error('Choose a school workspace before starting a chat.');
        return;
      }

      try {
        setStartingMemberId(member.userId);
        const result = await startConversation({
          orgId,
          memberUserId: member.userId,
          memberEmail: member.email,
          memberName: member.name,
          memberRole: member.role
        });
        setSelectedConversationId(result.conversationId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to start chat');
      } finally {
        setStartingMemberId(null);
      }
    },
    [organization?.id, startConversation]
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
        authorUserId: user?.id,
        authorEmail:
          user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress,
        authorName: user?.fullName ?? user?.username ?? undefined,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      setDraft('');
      setAttachments([]);
    },
    [attachments, draft, selectedConversationId, sendMessage, user]
  );

  if (conversationsQuery === undefined || membersLoading) {
    return (
      <div className='border-border/50 bg-background/70 flex h-[calc(100dvh-5.5rem)] items-center justify-center rounded-2xl border p-6 text-sm text-muted-foreground backdrop-blur-xl'>
        Loading staff inbox...
      </div>
    );
  }

  return (
    <div className='border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full grid-rows-[auto,1fr] gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl sm:gap-4 sm:p-4 lg:[grid-template-columns:30%_1fr] lg:grid-rows-[1fr] lg:gap-4 lg:rounded-3xl lg:p-5'>
      <ConversationSelect
        conversations={conversations}
        selectedId={selectedConversationId}
        members={members}
        startingMemberId={startingMemberId}
        onSelect={selectConversation}
        onStartConversation={handleStartConversation}
      />
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversationId}
        members={members}
        startingMemberId={startingMemberId}
        onSelect={selectConversation}
        onStartConversation={handleStartConversation}
      />
      {activeConversation ? (
        <ChatArea
          conversation={activeConversation}
          draft={draft}
          onDraftChange={setDraft}
          onSubmit={handleSubmit}
          attachments={attachments}
          onAddAttachments={handleAddAttachments}
          onRemoveAttachment={handleRemoveAttachment}
        />
      ) : (
        <div className='border-border/40 bg-background/80 flex min-h-0 flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center backdrop-blur sm:p-8 lg:col-start-2 lg:col-end-3 lg:rounded-3xl'>
          <div className='text-lg font-semibold'>No chat selected</div>
          <p className='text-muted-foreground max-w-md text-sm'>
            Start a new staff chat from the left panel, or select an existing conversation when it
            appears in your inbox.
          </p>
        </div>
      )}
    </div>
  );
}
