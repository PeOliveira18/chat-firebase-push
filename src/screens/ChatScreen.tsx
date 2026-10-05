import { useCallback, useLayoutEffect, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { ChatInput, ChatInputPayload } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useCurrentUser } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/useProfiles';
import { RootStackScreenProps } from '../navigation/types';
import { theme } from '../theme';
import { DisplayMessage } from '../types/chat';
import { PublicProfile } from '../types/user';
import { getOtherParticipantId } from '../utils/conversationId';

type Props = RootStackScreenProps<'Chat'>;

export function ChatScreen({ navigation, route }: Props) {
  const { conversationId, conversationType } = route.params;
  const isGroup = conversationType === 'group';
  const currentUser = useCurrentUser();

  const otherUid = useMemo(
    () => (isGroup ? null : getOtherParticipantId(conversationId, currentUser.uid)),
    [isGroup, conversationId, currentUser.uid],
  );
  const otherIds = useMemo(() => (otherUid ? [otherUid] : []), [otherUid]);
  const { profilesById } = usePublicProfiles(otherIds);
  const otherProfile: PublicProfile | null = otherUid ? (profilesById[otherUid] ?? null) : null;

  const groupState = useGroup(isGroup ? conversationId : undefined, currentUser.uid);
  const { group, members, isOwner, accessRevoked } = groupState;

  const chat = useChat({ conversationId, conversationType, senderId: currentUser.uid });

  const title = isGroup ? (group?.name ?? 'Grupo') : (otherProfile?.name ?? 'Conversa');
  const photoUrl = isGroup ? (group?.photoUrl ?? '') : (otherProfile?.photoUrl ?? '');

  // Foto no cabeçalho: abre o perfil (individual) ou a lista de integrantes (grupo).
  const openDetails = useCallback(() => {
    if (isGroup) {
      navigation.navigate('GroupMembers', { groupId: conversationId });
    } else if (otherUid) {
      navigation.navigate('Profile', { uid: otherUid });
    }
  }, [isGroup, navigation, conversationId, otherUid]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Avatar
            uri={photoUrl}
            size={36}
            variant={isGroup ? 'group' : 'user'}
            onPress={openDetails}
            accessibilityLabel={isGroup ? 'Ver integrantes do grupo' : 'Ver perfil'}
          />
          <View style={styles.headerTexts}>
            <Text style={styles.headerName} numberOfLines={1}>
              {title}
            </Text>
            {isGroup && group ? (
              <Text style={styles.headerSubtitle}>{group.memberIds.length} integrantes</Text>
            ) : null}
          </View>
        </View>
      ),
      headerRight: () =>
        isGroup && isOwner ? (
          <Pressable
            onPress={() => navigation.navigate('GroupForm', { groupId: conversationId })}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.headerAction}>Editar</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, photoUrl, title, isGroup, group, isOwner, openDetails, conversationId]);

  const membersById = useMemo(() => {
    const map = new Map<string, PublicProfile>();
    members.forEach((member) => map.set(member.uid, member));
    return map;
  }, [members]);

  // FlatList invertida: a mensagem mais recente fica junto ao campo de texto.
  const invertedMessages = useMemo(() => [...chat.messages].reverse(), [chat.messages]);

  const handleSend = useCallback(
    async (payload: ChatInputPayload) => {
      await chat.sendMessage(payload);
    },
    [chat],
  );

  const renderItem = useCallback(
    ({ item }: { item: DisplayMessage }) => {
      const isMine = item.senderId === currentUser.uid;
      const author = membersById.get(item.senderId);
      const targetName =
        item.target.type === 'member'
          ? item.target.memberId === currentUser.uid
            ? 'você'
            : (membersById.get(item.target.memberId)?.name ?? 'integrante')
          : undefined;

      return (
        <ChatMessage
          message={item}
          isMine={isMine}
          authorName={isGroup ? (author?.name ?? 'Ex-integrante') : undefined}
          targetName={targetName}
          mentionsMe={item.mentionedUserIds.includes(currentUser.uid)}
          onRetry={chat.retryMessage}
          onDiscard={chat.discardMessage}
        />
      );
    },
    [currentUser.uid, membersById, isGroup, chat.retryMessage, chat.discardMessage],
  );

  const isDirectInvalid = !isGroup && !otherUid;
  const blocked = accessRevoked || isDirectInvalid;

  if (chat.loading && !chat.error) {
    return <Loading message="Carregando mensagens..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {chat.error ? <ErrorMessage message={chat.error} /> : null}
        {isDirectInvalid ? <ErrorMessage message="Você não participa desta conversa." /> : null}
        {chat.pushWarning ? (
          <ErrorMessage message={chat.pushWarning} variant="warning" onDismiss={chat.dismissPushWarning} />
        ) : null}

        <FlatList
          data={invertedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted={invertedMessages.length > 0}
          contentContainerStyle={invertedMessages.length === 0 ? styles.emptyContainer : styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            chat.error ? null : (
              <EmptyState title="Nenhuma mensagem ainda" description="Envie a primeira mensagem da conversa." />
            )
          }
        />

        <ChatInput
          currentUid={currentUser.uid}
          isGroup={isGroup}
          members={isGroup ? members : []}
          disabled={blocked || Boolean(chat.error)}
          onSend={handleSend}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  list: {
    paddingVertical: theme.spacing.sm,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 240,
  },
  headerTexts: {
    marginLeft: theme.spacing.sm,
    flexShrink: 1,
  },
  headerName: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  headerAction: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
