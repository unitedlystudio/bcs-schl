'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useApplicationAccess } from '@/components/layout/application-access-gate';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { Id } from '../../../../convex/_generated/dataModel';
import { api } from '../../../../convex/_generated/api';
import type { Attachment, Conversation, StaffMember } from '../utils/types';
import { ChatArea } from './chat-area';
import { ConversationList } from './conversation-list';

export function Messenger() {
  const { user } = useApplicationAccess();
  const conversationsQuery = useQuery(api.conversations.list, {});
  const conversations = useMemo(() => conversationsQuery ?? [], [conversationsQuery]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [mobileView, setMobileView] = useState<'inbox' | 'thread'>('inbox');
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [startingMemberId, setStartingMemberId] = useState<string | null>(null);
  const sendMessage = useMutation(api.conversations.sendMessage);
  const generateAttachmentUploadUrl = useMutation(api.conversations.generateAttachmentUploadUrl);
  const markRead = useMutation(api.conversations.markRead);
  const startConversation = useMutation(api.conversations.startConversation);

  useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        setMembersLoading(true);
        const response = await fetch('/api/chat-members', {
          cache: 'no-store',
          credentials: 'same-origin'
        });

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
  }, []);

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

    const viewerUserId = user?.authUserId;
    const viewerEmails = [user?.email].map((value) => value?.trim().toLowerCase()).filter(Boolean);
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
      setMobileView('thread');
      void markRead({ conversationId: id as Id<'conversations'> });
    },
    [markRead]
  );

  const handleStartConversation = useCallback(
    async (member: StaffMember) => {
      try {
        setStartingMemberId(member.userId);
        const result = await startConversation({
          memberUserId: member.userId as Id<'appUsers'>
        });
        setSelectedConversationId(result.conversationId);
        setMobileView('thread');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to start chat');
      } finally {
        setStartingMemberId(null);
      }
    },
    [startConversation]
  );

  const handleAddAttachments = useCallback((files: FileList) => {
    const selectedFiles = Array.from(files).slice(0, 5);
    const oversizedFile = selectedFiles.find((file) => file.size > 10 * 1024 * 1024);

    if (oversizedFile) {
      toast.error(`${oversizedFile.name} is larger than the 10 MB attachment limit.`);
      return;
    }

    const newAttachments: Attachment[] = selectedFiles.map((file) => ({
      id: 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      file
    }));
    setAttachments((prev) => [...prev, ...newAttachments].slice(0, 5));
  }, []);

  const handleRemoveAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!selectedConversationId) return;
      if (!draft.trim() && attachments.length === 0) return;

      try {
        const uploadedAttachments = await Promise.all(
          attachments.map(async ({ file, url: _url, ...attachment }) => {
            if (!file) return attachment;

            const uploadUrl = await generateAttachmentUploadUrl({});
            const uploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              headers: { 'Content-Type': attachment.type },
              body: file
            });

            if (!uploadResponse.ok) {
              throw new Error(`Unable to upload ${attachment.name}.`);
            }

            const { storageId } = (await uploadResponse.json()) as { storageId: Id<'_storage'> };
            return { ...attachment, storageId };
          })
        );

        await sendMessage({
          conversationId: selectedConversationId as Id<'conversations'>,
          text: draft,
          authorUserId: user?.authUserId,
          authorEmail: user?.email,
          authorName: user?.name,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
        });

        setDraft('');
        setAttachments([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to send message.');
      }
    },
    [attachments, draft, generateAttachmentUploadUrl, selectedConversationId, sendMessage, user]
  );

  if (conversationsQuery === undefined || membersLoading) {
    return (
      <div className='border-border/50 bg-background/70 flex h-[calc(100dvh-5.5rem)] items-center justify-center rounded-2xl border p-6 text-sm text-muted-foreground backdrop-blur-xl'>
        Loading staff inbox...
      </div>
    );
  }

  return (
    <div className='border-border/50 bg-background/70 relative grid h-[calc(100dvh-5.5rem)] w-full overflow-hidden rounded-2xl border p-3 backdrop-blur sm:p-4 lg:grid-cols-[30%_1fr] lg:gap-4 lg:rounded-3xl lg:p-5'>
      <ConversationList
        conversations={conversations}
        selectedId={selectedConversationId}
        members={members}
        startingMemberId={startingMemberId}
        mobileVisible={mobileView === 'inbox'}
        onSelect={selectConversation}
        onStartConversation={handleStartConversation}
      />
      {activeConversation ? (
        <div
          className={
            mobileView === 'thread'
              ? 'flex min-h-0 flex-col lg:col-start-2 lg:col-end-3'
              : 'hidden lg:flex lg:min-h-0 lg:flex-col lg:col-start-2 lg:col-end-3'
          }
        >
          <ChatArea
            conversation={activeConversation}
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={handleSubmit}
            attachments={attachments}
            onAddAttachments={handleAddAttachments}
            onRemoveAttachment={handleRemoveAttachment}
            onBack={() => setMobileView('inbox')}
          />
        </div>
      ) : (
        <div className='border-border/40 bg-background/80 hidden min-h-0 flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center backdrop-blur lg:col-start-2 lg:col-end-3 lg:flex lg:rounded-3xl lg:p-8'>
          <div className='text-lg font-semibold'>No chat selected</div>
          <p className='text-muted-foreground max-w-md text-sm'>
            Start a new staff chat from the inbox, or select an existing conversation when it
            appears.
          </p>
        </div>
      )}
    </div>
  );
}
