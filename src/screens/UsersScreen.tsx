import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { UserItem } from '../components/UserItem';
import { useCurrentUser } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import { RootStackScreenProps } from '../navigation/types';
import { findOrCreateDirectConversation } from '../services/chatService';
import { addMembers } from '../services/groupService';
import { theme } from '../theme';
import { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errorMessages';
import { showAlert } from '../utils/dialogs';

type Props = RootStackScreenProps<'Users'>;

export function UsersScreen({ navigation, route }: Props) {
  const params = route.params;
  const currentUser = useCurrentUser();
  const { users, search, setSearch, loading, error } = useUsers(currentUser.uid);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    params.mode === 'selectMembers' ? params.selectedIds : [],
  );

  const excludedIds = useMemo(
    () => new Set(params.mode === 'selectMembers' ? params.excludedIds : []),
    [params],
  );
  const maxSelectable = params.mode === 'selectMembers' ? params.maxSelectable : null;
  const limitReached = maxSelectable !== null && selectedIds.length >= maxSelectable;

  const startConversation = useCallback(
    async (user: PublicProfile) => {
      setOpeningId(user.uid);

      try {
        const conversation = await findOrCreateDirectConversation(currentUser.uid, user.uid);
        navigation.replace('Chat', { conversationId: conversation.id, conversationType: 'direct' });
      } catch (startError) {
        showAlert('Erro', getErrorMessage(startError, 'Não foi possível iniciar a conversa.'));
      } finally {
        setOpeningId(null);
      }
    },
    [currentUser.uid, navigation],
  );

  const toggleSelection = useCallback(
    (user: PublicProfile) => {
      setSelectedIds((current) => {
        if (current.includes(user.uid)) {
          return current.filter((id) => id !== user.uid);
        }

        if (maxSelectable !== null && current.length >= maxSelectable) {
          showAlert('Grupo sem vagas', 'O limite de integrantes do grupo foi atingido.');
          return current;
        }

        return [...current, user.uid];
      });
    },
    [maxSelectable],
  );

  const handlePress = useCallback(
    (user: PublicProfile) => {
      if (params.mode === 'direct') {
        startConversation(user);
      } else {
        toggleSelection(user);
      }
    },
    [params.mode, startConversation, toggleSelection],
  );

  const confirmSelection = useCallback(async () => {
    if (params.mode !== 'selectMembers') {
      return;
    }

    // Criação: devolve a seleção ao formulário do grupo.
    if (!params.groupId) {
      navigation.popTo('GroupForm', { selectedMemberIds: selectedIds });
      return;
    }

    // Edição: adiciona pela API (transação que respeita o limite) e volta.
    if (selectedIds.length === 0) {
      navigation.goBack();
      return;
    }

    setConfirming(true);

    try {
      await addMembers(params.groupId, selectedIds);
      navigation.goBack();
    } catch (addError) {
      showAlert('Erro', getErrorMessage(addError, 'Não foi possível adicionar os integrantes.'));
    } finally {
      setConfirming(false);
    }
  }, [navigation, params, selectedIds]);

  const renderItem = useCallback(
    ({ item }: { item: PublicProfile }) => {
      if (params.mode === 'direct') {
        return (
          <UserItem
            user={item}
            onPress={handlePress}
            disabled={openingId !== null}
            hint={openingId === item.uid ? 'Abrindo conversa...' : undefined}
          />
        );
      }

      const isMember = excludedIds.has(item.uid);
      const selected = selectedIds.includes(item.uid);

      return (
        <UserItem
          user={item}
          onPress={handlePress}
          selected={selected}
          disabled={isMember || (!selected && limitReached)}
          hint={isMember ? 'Já é integrante' : undefined}
        />
      );
    },
    [params.mode, handlePress, openingId, excludedIds, selectedIds, limitReached],
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.search}
          accessibilityLabel="Buscar usuários"
        />
        {params.mode === 'selectMembers' ? (
          <Text style={styles.selectionInfo}>
            {selectedIds.length} selecionado(s)
            {maxSelectable !== null ? ` · ${Math.max(maxSelectable - selectedIds.length, 0)} vaga(s) restante(s)` : ''}
          </Text>
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}
      </View>

      {loading ? (
        <Loading message="Carregando usuários..." />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          renderItem={renderItem}
          extraData={[selectedIds, openingId]}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={users.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            <EmptyState
              title={search ? 'Nenhum usuário encontrado' : 'Nenhum usuário disponível'}
              description={search ? 'Tente outro nome.' : 'Ainda não há outros usuários cadastrados.'}
            />
          }
        />
      )}

      {params.mode === 'selectMembers' ? (
        <View style={styles.footer}>
          <Button
            title={params.groupId ? 'Adicionar ao grupo' : 'Confirmar seleção'}
            onPress={confirmSelection}
            loading={confirming}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBox: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  search: {
    minHeight: 44,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
  },
  selectionInfo: {
    marginTop: theme.spacing.sm,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
