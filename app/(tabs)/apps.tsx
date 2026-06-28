import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Trash2, Shield, ShieldOff, Clock, Pencil, Search, Smartphone } from 'lucide-react-native';
import { theme } from '@/lib/theme';
import {
  fetchControlledApps,
  addControlledApp,
  updateControlledApp,
  deleteControlledApp,
} from '@/lib/data';
import { getInstalledApps, type InstalledApp } from '@/lib/appscanner';
import { formatMinutes } from '@/lib/utils';
import type { ControlledApp } from '@/types';

const ICON_OPTIONS = ['🎮', '🔫', '🧱', '🎵', '🌍', '📱', '🚗', '⚽', '🎲', '🎯', '🃏', '🏆'];

export default function AppsScreen() {
  const insets = useSafeAreaInsets();

  const [apps, setApps] = useState<ControlledApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingApp, setEditingApp] = useState<ControlledApp | null>(null);
  const [appName, setAppName] = useState('');
  const [appIcon, setAppIcon] = useState('🎮');
  const [dailyLimit, setDailyLimit] = useState('30');
  const [packageName, setPackageName] = useState('');
  const [saving, setSaving] = useState(false);

  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadApps = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchControlledApps();
      setApps(data);
    } catch {
      setError('加载失败,请下拉刷新');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const openAddModal = () => {
    setEditingApp(null);
    setAppName('');
    setAppIcon('🎮');
    setDailyLimit('30');
    setPackageName('');
    setModalVisible(true);
  };

  const openEditModal = (app: ControlledApp) => {
    setEditingApp(app);
    setAppName(app.app_name);
    setAppIcon(app.app_icon || '🎮');
    setDailyLimit(String(app.daily_limit_minutes));
    setPackageName(app.package_name || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const name = appName.trim();
    const limit = parseInt(dailyLimit, 10);
    if (!name) {
      Alert.alert('提示', '请输入应用名称');
      return;
    }
    if (isNaN(limit) || limit <= 0) {
      Alert.alert('提示', '请输入有效的时长(分钟)');
      return;
    }
    setSaving(true);
    try {
      if (editingApp) {
        const updated = await updateControlledApp(editingApp.id, {
          app_name: name,
          app_icon: appIcon,
          daily_limit_minutes: limit,
          package_name: packageName || null,
        });
        setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const created = await addControlledApp(name, appIcon, limit, packageName || undefined);
        setApps((prev) => [...prev, created]);
      }
      setModalVisible(false);
    } catch {
      Alert.alert('错误', '保存失败,请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleControl = async (app: ControlledApp) => {
    try {
      const updated = await updateControlledApp(app.id, {
        is_controlled: !app.is_controlled,
      });
      setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      Alert.alert('错误', '操作失败,请重试');
    }
  };

  const handleDelete = (app: ControlledApp) => {
    Alert.alert('确认删除', `确定要删除「${app.app_name}」吗?`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteControlledApp(app.id);
            setApps((prev) => prev.filter((a) => a.id !== app.id));
          } catch {
            Alert.alert('错误', '删除失败,请重试');
          }
        },
      },
    ]);
  };

  const handleScanApps = async () => {
    setScanning(true);
    setScanModalVisible(true);
    setSearchQuery('');
    try {
      const installed = await getInstalledApps();
      setInstalledApps(installed);
    } catch {
      Alert.alert('提示', '无法读取已安装应用,请手动添加');
      setScanModalVisible(false);
    } finally {
      setScanning(false);
    }
  };

  const handleSelectInstalledApp = (app: InstalledApp) => {
    setEditingApp(null);
    setAppName(app.appName);
    setAppIcon(app.isGame ? '🎮' : '📱');
    setDailyLimit('30');
    setPackageName(app.packageName);
    setScanModalVisible(false);
    setModalVisible(true);
  };

  const filteredApps = installedApps.filter((app) =>
    app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>应用管控</Text>
        <Text style={styles.subtitle}>管理受控应用和时长限制</Text>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadApps} colors={[theme.colors.primary]} />}>
        {Platform.OS === 'android' ? (
          <Pressable
            style={({ pressed }) => [styles.scanCard, pressed && { opacity: 0.85 }]}
            onPress={handleScanApps}>
            <View style={styles.scanIconWrap}>
              <Smartphone size={20} color={theme.colors.surface} strokeWidth={2} />
            </View>
            <View style={styles.scanInfo}>
              <Text style={styles.scanTitle}>扫描手机应用</Text>
              <Text style={styles.scanDesc}>从已安装应用中添加管控</Text>
            </View>
          </Pressable>
        ) : null}

        {apps.map((app) => (
          <View key={app.id} style={styles.appCard}>
            <View style={styles.appCardTop}>
              <View style={styles.appIconWrap}>
                <Text style={styles.appIcon}>{app.app_icon || '🎮'}</Text>
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName}>{app.app_name}</Text>
                <View style={styles.limitRow}>
                  <Clock size={14} color={theme.colors.textSecondary} strokeWidth={2} />
                  <Text style={styles.limitText}>每日 {formatMinutes(app.daily_limit_minutes)}</Text>
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.controlToggle,
                  app.is_controlled ? styles.controlOn : styles.controlOff,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => handleToggleControl(app)}>
                {app.is_controlled ? (
                  <Shield size={16} color={theme.colors.surface} strokeWidth={2} />
                ) : (
                  <ShieldOff size={16} color={theme.colors.surface} strokeWidth={2} />
                )}
                <Text style={styles.controlText}>
                  {app.is_controlled ? '管控中' : '未管控'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.appCardActions}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => openEditModal(app)}>
                <Pencil size={16} color={theme.colors.textSecondary} strokeWidth={2} />
                <Text style={styles.actionText}>编辑</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                onPress={() => handleDelete(app)}>
                <Trash2 size={16} color={theme.colors.error} strokeWidth={2} />
                <Text style={[styles.actionText, { color: theme.colors.error }]}>删除</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
        onPress={openAddModal}>
        <Plus size={28} color={theme.colors.surface} strokeWidth={2.5} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingApp ? '编辑应用' : '添加应用'}</Text>

            <Text style={styles.inputLabel}>应用名称</Text>
            <TextInput
              style={styles.textInput}
              value={appName}
              onChangeText={setAppName}
              placeholder="如:王者荣耀"
              placeholderTextColor={theme.colors.textLight}
              maxLength={20}
            />

            <Text style={styles.inputLabel}>应用图标</Text>
            <View style={styles.iconPickerRow}>
              {ICON_OPTIONS.map((icon) => (
                <Pressable
                  key={icon}
                  style={({ pressed }) => [
                    styles.iconOption,
                    appIcon === icon && styles.iconOptionSelected,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setAppIcon(icon)}>
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.inputLabel}>每日时长限制(分钟)</Text>
            <TextInput
              style={styles.textInput}
              value={dailyLimit}
              onChangeText={setDailyLimit}
              placeholder="30"
              placeholderTextColor={theme.colors.textLight}
              keyboardType="numeric"
              maxLength={4}
            />

            {packageName ? (
              <View style={styles.packageInfo}>
                <Text style={styles.packageLabel}>已绑定包名: {packageName}</Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>取消</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, styles.modalSave, pressed && { opacity: 0.85 }]}
                onPress={handleSave}
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

      <Modal visible={scanModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.scanHeader}>
              <Text style={styles.modalTitle}>选择应用</Text>
              <Pressable onPress={() => setScanModalVisible(false)}>
                <Text style={styles.closeText}>关闭</Text>
              </Pressable>
            </View>

            <View style={styles.searchRow}>
              <Search size={18} color={theme.colors.textLight} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="搜索应用名称"
                placeholderTextColor={theme.colors.textLight}
              />
            </View>

            {scanning ? (
              <View style={styles.scanningState}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.scanningText}>正在扫描已安装应用...</Text>
              </View>
            ) : (
              <ScrollView style={styles.scanList}>
                {filteredApps.map((app) => (
                  <Pressable
                    key={app.packageName}
                    style={({ pressed }) => [styles.scanItem, pressed && { opacity: 0.7 }]}
                    onPress={() => handleSelectInstalledApp(app)}>
                    <View style={styles.scanItemLeft}>
                      <View style={[styles.scanItemIcon, app.isGame ? styles.scanItemGame : null]}>
                        <Text style={styles.scanItemEmoji}>{app.isGame ? '🎮' : '📱'}</Text>
                      </View>
                      <View>
                        <Text style={styles.scanItemName}>{app.appName}</Text>
                        <Text style={styles.scanItemPackage}>{app.packageName}</Text>
                      </View>
                    </View>
                    {app.isGame ? (
                      <View style={styles.gameBadge}>
                        <Text style={styles.gameBadgeText}>游戏</Text>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: theme.fontSizes.heading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  subtitle: {
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
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    gap: theme.spacing.md,
  },
  scanIconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanInfo: {
    flex: 1,
  },
  scanTitle: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
  },
  scanDesc: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  appCard: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  appCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIconWrap: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIcon: {
    fontSize: 28,
  },
  appInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  appName: {
    fontSize: theme.fontSizes.subtitle,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  limitText: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  controlToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  controlOn: {
    backgroundColor: theme.colors.primary,
  },
  controlOff: {
    backgroundColor: theme.colors.textLight,
  },
  controlText: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textOnPrimary,
  },
  appCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: theme.fontSizes.heading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: theme.spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
  },
  iconPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  iconOptionText: {
    fontSize: 24,
  },
  packageInfo: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
  },
  packageLabel: {
    fontSize: theme.fontSizes.caption,
    fontFamily: theme.fonts.regular,
    color: theme.colors.primaryDark,
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
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  closeText: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textPrimary,
  },
  scanningState: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
    gap: 12,
  },
  scanningText: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
  },
  scanList: {
    maxHeight: 400,
  },
  scanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  scanItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  scanItemIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanItemGame: {
    backgroundColor: theme.colors.primarySoft,
  },
  scanItemEmoji: {
    fontSize: 22,
  },
  scanItemName: {
    fontSize: theme.fontSizes.body,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textPrimary,
  },
  scanItemPackage: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  gameBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radius.sm,
  },
  gameBadgeText: {
    fontSize: 11,
    fontFamily: theme.fonts.bold,
    color: theme.colors.primaryDark,
  },
});
