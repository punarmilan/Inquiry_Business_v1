import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { theme, createThemedStyles } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useApp } from '../../context/AppContext';
import { listWalletTransactions } from '../../services/api';
import type { WalletTransaction } from '../../types';
import type { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Wallet'>;

const formatAmount = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const sourceLabel: Record<WalletTransaction['source'], string> = {
  add_money: 'Added Money',
  withdrawal: 'Withdrawal',
};

const statusLabel: Record<WalletTransaction['status'], string> = {
  completed: 'Completed',
  pending: 'Processing',
  rejected: 'Rejected',
};

export const WalletScreen: React.FC<Props> = ({ navigation }) => {
  const { accessToken, currentUser, addWalletMoney, withdrawWalletMoney } = useApp();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<'add' | 'withdraw' | null>(null);
  const [amountText, setAmountText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const balance = currentUser?.wallet?.balance ?? 0;

  const fetchTransactions = useCallback(() => {
    if (!accessToken) return;
    listWalletTransactions(accessToken, { limit: 50 })
      .then((res) => setTransactions(res.data))
      .catch(() => setTransactions([]))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions();
  };

  const openModal = (type: 'add' | 'withdraw') => {
    setAmountText('');
    setError('');
    setModal(type);
  };

  const closeModal = () => {
    if (submitting) return;
    setModal(null);
  };

  const handleConfirm = async () => {
    const amount = Number(amountText);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (modal === 'withdraw' && amount > balance) {
      setError('Amount exceeds your available balance');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (modal === 'add') {
        await addWalletMoney(amount);
      } else if (modal === 'withdraw') {
        await withdrawWalletMoney(amount);
      }
      setModal(null);
      fetchTransactions();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Wallet</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceValue}>{formatAmount(balance)}</Text>
        <View style={styles.balanceActions}>
          <Button
            label="Add Money"
            onPress={() => openModal('add')}
            variant="outline"
            style={styles.balanceBtn}
            icon={<MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />}
          />
          <Button
            label="Withdraw"
            onPress={() => openModal('withdraw')}
            variant="outline"
            style={styles.balanceBtn}
            icon={<MaterialCommunityIcons name="bank-transfer-out" size={18} color={theme.colors.primary} />}
          />
        </View>
      </View>

      <Text style={styles.historyTitle}>History</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary]} />}
          renderItem={({ item }) => <TransactionRow transaction={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <MaterialCommunityIcons name="wallet-outline" size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyText}>No transactions yet.</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!modal} animationType="fade" transparent onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modal === 'add' ? 'Add Money' : 'Withdraw Money'}</Text>
            {modal === 'withdraw' ? (
              <Text style={styles.modalSubtitle}>Available balance: {formatAmount(balance)}</Text>
            ) : null}
            <Input
              label="Amount"
              placeholder="Enter amount"
              value={amountText}
              onChangeText={(value) => setAmountText(value.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              icon="currency-inr"
              error={error || undefined}
              autoFocus
            />
            <View style={styles.modalActions}>
              <Button label="Cancel" variant="outline" onPress={closeModal} style={styles.modalBtn} disabled={submitting} />
              <Button
                label={modal === 'add' ? 'Add Money' : 'Withdraw'}
                onPress={handleConfirm}
                style={styles.modalBtn}
                loading={submitting}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const TransactionRow: React.FC<{ transaction: WalletTransaction }> = ({ transaction }) => {
  const isCredit = transaction.type === 'credit';
  const sign = isCredit ? '+' : '-';
  const amountColor =
    transaction.status === 'rejected' ? theme.colors.textMuted : isCredit ? theme.colors.success : theme.colors.danger;

  return (
    <View style={styles.txnRow}>
      <View
        style={[
          styles.txnIcon,
          { backgroundColor: isCredit ? `${theme.colors.success}1A` : `${theme.colors.danger}1A` },
        ]}
      >
        <MaterialCommunityIcons
          name={isCredit ? 'arrow-down' : 'arrow-up'}
          size={20}
          color={isCredit ? theme.colors.success : theme.colors.danger}
        />
      </View>
      <View style={styles.txnCopy}>
        <Text style={styles.txnTitle}>{sourceLabel[transaction.source]}</Text>
        <Text style={styles.txnDate}>{new Date(transaction.createdAt).toLocaleString()}</Text>
      </View>
      <View style={styles.txnAmountWrap}>
        <Text style={[styles.txnAmount, { color: amountColor }]}>
          {sign}
          {formatAmount(transaction.amount)}
        </Text>
        {transaction.status !== 'completed' ? (
          <Text style={styles.txnStatus}>{statusLabel[transaction.status]}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = createThemedStyles((c) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: c.text,
  },
  balanceCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.xl,
    backgroundColor: c.primary,
    padding: theme.spacing.lg,
  },
  balanceLabel: {
    ...theme.typography.caption,
    color: c.textInverse,
    opacity: 0.85,
  },
  balanceValue: {
    ...theme.typography.h1,
    color: c.textInverse,
    marginTop: 4,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  balanceBtn: {
    flex: 1,
    backgroundColor: c.textInverse,
  },
  historyTitle: {
    ...theme.typography.bodyBold,
    color: c.text,
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: c.textMuted,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
  },
  txnIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnCopy: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  txnTitle: {
    ...theme.typography.bodyBold,
    color: c.text,
  },
  txnDate: {
    ...theme.typography.tiny,
    color: c.textMuted,
    marginTop: 2,
  },
  txnAmountWrap: {
    alignItems: 'flex-end',
  },
  txnAmount: {
    ...theme.typography.bodyBold,
  },
  txnStatus: {
    ...theme.typography.tiny,
    color: c.textMuted,
    marginTop: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: c.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: theme.radius.xl,
    backgroundColor: c.surface,
    padding: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.h3,
    color: c.text,
  },
  modalSubtitle: {
    ...theme.typography.caption,
    color: c.textSecondary,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  modalBtn: {
    flex: 1,
  },
}));
