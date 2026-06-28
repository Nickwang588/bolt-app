import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Bell, Info, Heart, ChevronRight, ShieldCheck, ShieldAlert, Smartphone, Battery, BellRing } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import { fetchGuardSettings, updateGuardSettings } from '@/lib/data';
import {
  checkAllPermissions,
  requestPermission,
  areAllPermissionsGranted,
  getPermissionLabel,
  getPermissionDesc,
  type PermissionState,
  type PermissionType,
} from '@/lib/permissions';
import type { GuardSettings } from '@/types';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  const [settings, setSettings] = useState<GuardSettings | null>(null);
  const [permissions, setPermissions] = useState<PermissionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState('5');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [s, p] = await Promise.all([
        fetchGuardSettings(),
        checkAllPermissions(),
      ]);
      setSettings(s);
      setPermissions(p);
      setReminderMinutes(String(s.reminder_before_minutes));
    } catch {
      setError('数据加载失败,请下拉刷新');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveReminder = async () => {
    const minutes = parseInt(reminderMinutes, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 60) {
      Alert.alert('提示', '请输入1-60之间的数字');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateGuardSettings(
        settings?.is_guard_enabled ?? true,
        minutes
      );
      setSettings(updated);
      setReminderModalVisible(false);
    } catch {
      Alert.alert('错误', '保存失败,请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPermission = async (type: PermissionType) => {
    const status = await requestPermission(type);
    const updated = await checkAllPermissions();
    setPermissions(updated);
    if (status === 'granted') {
      Alert.alert('成功', `${getPermissionLabel(type)}已开启`);
    }
  };

  const allPermissionsGranted = permissions ? areAllPermissionsGranted(permissions) : true;
  const isAndroid = Platform.OS === 'android';

  const permissionItems: { type: PermissionType; icon: typeof Shield; color: string; bg: string }[] = [
    { type: 'usage_stats', icon: Shield, color: theme.colors.primary, bg: theme.colors.primarySoft },
    { type: 'overlay', icon: ShieldAlert, color: theme.colors.secondary, bg: theme.colors.secondaryLight },
    { type: 'battery', icon: Battery, color: theme.colors.success, bg: '#E8F6E8' },
    { type: 'notifications', icon: BellRing, color: theme.colors.accent, bg: theme.colors.primarySoft },
  ];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[theme.colors.primary]} />}>
      <View style={styles.headerSection}>
        <View style={styles.avatarWrap}>
          <Heart size={32} color={theme.colors.surface} strokeWidth={2} />
        </View>
        <Text style={styles.userName}>家长</Text>
        <Text style={styles.userSub}>亲子守护 · 守护孩子健康成长</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {isAndroid ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>权限管理</Text>
          <View style={styles.card}>
            {allPermissionsGranted ? (
              <View style={styles.allGrantedBanner}>
                <ShieldCheck size={20} color={theme.colors.success} strokeWidth={2} />
                <Text style={styles.allGrantedText}>所有权限已开启,守护功能正常运行</Text>
              </View>
            ) : null}

            {permissionItems.map((item, idx) => {
              const status = permissions ? permissions[item.type] : 'not_determined';
              const isGranted = status === 'granted';
              const Icon = item.icon;

              return (
                <View key={item.type}>
                  {idx > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.cardRow}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.cardIcon, { backgroundColor: item.bg }]}>
                        <Icon size={18} color={item.color} strokeWidth={2} />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>{getPermissionLabel(item.type)}</Text>
                        <Text style={styles.cardSub}>{getPermissionDesc(item.type)}</Text>
                      </View>
                    </View>
                    {isGranted ? (
                      <View style={styles.grantedBadge}>
                        <ShieldCheck size={14} color={theme.colors.success} strokeWidth={2} />
                        <Text style={styles.grantedText}>已开启</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [styles.enableBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => handleRequestPermission(item.type)}>
                        <Text style={styles.enableBtnText}>去开启</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>管控设置</Text>

        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.primarySoft }]}>
                <Shield size={18} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.cardTitle}>管控状态</Text>
                <Text style={styles.cardSub}>
                  {settings?.is_guard_enabled ? '已开启' : '已关闭'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, settings?.is_guard_enabled ? styles.statusOn : styles.statusOff]}>
              <Text style={styles.statusText}>
                {settings?.is_guard_enabled ? '开启' : '关闭'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.cardRow, pressed && { opacity: 0.7 }]}
            onPress={() => setReminderModalVisible(true)}>
            <View style={styles.cardLeft}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.secondaryLight }]}>
                <Bell size={18} color={theme.colors.secondary} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.cardTitle}>提前提醒时间</Text>
                <Text style={styles.cardSub}>
                  到达时限前 {settings?.reminder_before_minutes ?? 5} 分钟提醒
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={theme.colors.textLight} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardLeft}>
              <View style={[styles.cardIcon, { backgroundColor: theme.colors.primarySoft }]}>
                <Info size={18} color={theme.colors.primary} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.cardTitle}>版本信息</Text>
                <Text style={styles.cardSub}>亲子守护 v1.0.0</Text>
              </View>
            </View>
          </View>
          {isAndroid ? (
            <>
              <View style={styles.divider} />
              <View style={styles.cardRow}>
                <View style={styles.cardLeft}>
                  <View style={[styles.cardIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
                    <Smartphone size={18} color={theme.colors.textSecondary} strokeWidth={2} />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>适配机型</Text>
                    <Text style={styles.cardSub}>支持折叠屏 · vivo fold 5等</Text>
                  </View>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.tipCard}>
        <Heart size={16} color={theme.colors.primary} strokeWidth={2} />
        <Text style={styles.tipText}>
          温馨提示:合理管控游戏时间,陪伴孩子健康成长。建议每日游戏时长不超过1小时。
        </Text>
      </View>

      <Modal visible={reminderModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>设置提前提醒时间</Text>
            <Text style={styles.modalDesc}>
              在每日游戏时长到达上限前,提前多少分钟提醒孩子。建议5-10分钟。
            </Text>
            <TextInput
              style={styles.textInput}
              value={reminderMinutes}
              onChangeText={setReminderMinutes}
              placeholder="5"
              placeholderTextColor={theme.colors.textLight}
              keyboardType="numeric"
              maxLength={2}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setReminderModalVisible(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalSave, pressed && { opacity: 0.85 }]}
                onPress={handleSaveReminder}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color={theme.colors.surface} />
                ) : (
                  <Text style={styles.modalSaveText}>保存</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    gap: 12,
  },
  loadingText: {
    fontSize: theme.fontSizes.body,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.regular,
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  userName: {
    fontSize: theme.fontSizes.heading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  userSub: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  errorBanner: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#FDEDE9',
    borderRadius: theme.radius.md,
  },
  errorText: {
    fontSize: theme.fontSizes.body,
    color: theme.colors.error,
    fontFamily: theme.fonts.regular,
  },
  section: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  allGrantedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.md,
    backgroundColor: '#E8F6E8',
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
  },
  allGrantedText: {
    flex: 1,
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.success,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textPrimary,
  },
  cardSub: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E8F6E8',
    borderRadius: theme.radius.full,
  },
  grantedText: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.bold,
    color: theme.colors.success,
  },
  enableBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.full,
  },
  enableBtnText: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  statusOn: {
    backgroundColor: theme.colors.primarySoft,
  },
  statusOff: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  statusText: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.bold,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
  },
  tipText: {
    flex: 1,
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.primaryDark,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: theme.fontSizes.heading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: theme.fontSizes.title,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancel: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  modalCancelText: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textSecondary,
  },
  modalSave: {
    backgroundColor: theme.colors.primary,
  },
  modalSaveText: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
  },
});
