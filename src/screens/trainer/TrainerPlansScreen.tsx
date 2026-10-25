import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { TrainerApi } from '@/api/trainer';
import { TrainerCustomer, TrainerPlan, TrainerPlanPayload, TrainerPlanSale, TrainerPlanType } from '@/types';
import Card from '@/components/Card';
import EmptyState from '@/components/EmptyState';
import ScreenGlow from '@/components/ScreenGlow';
import ScreenHeader from '@/components/ScreenHeader';

const TYPE_META: Record<TrainerPlanType, { label: string; icon: keyof typeof Ionicons.glyphMap; hint: string }> = {
  WORKOUT: { label: 'Workout plan', icon: 'barbell-outline', hint: 'A training programme clients follow week by week.' },
  DIET: { label: 'Diet plan', icon: 'nutrition-outline', hint: 'Meal plans, macros and guidance.' },
  MEMBERSHIP: { label: 'Membership', icon: 'card-outline', hint: 'Monthly or annual — members join your sessions at no extra cost.' },
};

const errMsg = (e: any) => e?.response?.data?.error ?? e?.response?.data?.message ?? 'Please try again.';

function describe(p: TrainerPlan) {
  const price = p.price && p.price > 0 ? `LKR ${Number(p.price).toLocaleString()}` : 'Free';
  if (p.type === 'MEMBERSHIP') return `${price} / ${p.billingPeriod === 'ANNUAL' ? 'year' : 'month'}`;
  return `${price} · ${p.durationWeeks} week${p.durationWeeks === 1 ? '' : 's'}`;
}

/**
 * Trainer: create and manage workout plans, diet plans and memberships (T4/T5/T6), see their clients,
 * and write each client their own workout/diet plan or give a plan to one of their session customers.
 */
export default function TrainerPlansScreen({ navigation }: any) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const palette = useRoleTheme();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'plans' | 'sales'>('plans');
  const [editor, setEditor] = useState<{ plan?: TrainerPlan } | null>(null);
  const [clientPlan, setClientPlan] = useState<TrainerPlanSale | null>(null);
  const [assigning, setAssigning] = useState<TrainerPlan | null>(null);

  const { data: plans, isLoading } = useQuery({ queryKey: ['trainer-plans', 'mine'], queryFn: TrainerApi.getMyPlans });
  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ['trainer-plans', 'sales'], queryFn: TrainerApi.getPlanSales, enabled: tab === 'sales',
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => TrainerApi.setPlanActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainer-plans'] }),
    onError: (e) => Alert.alert('Could not update plan', errMsg(e)),
  });

  return (
    <View style={s.root}>
      <ScreenGlow />
      <ScreenHeader
        title="Plans & Memberships"
        subtitle="Workout plans, diet plans and memberships"
        compact
        onBack={() => navigation.goBack()}
        heroColors={[palette.heroStart, palette.heroMid, palette.heroEnd]}
      />

      <View style={s.tabs}>
        {(['plans', 'sales'] as const).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && { backgroundColor: palette.accent }]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && { color: colors.white }]}>{t === 'plans' ? 'My plans' : 'Clients'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {tab === 'plans' ? (
          <>
            <TouchableOpacity style={[s.newBtn, { backgroundColor: palette.accent }]} onPress={() => setEditor({})} accessibilityRole="button">
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={s.newText}>New plan</Text>
            </TouchableOpacity>
            {isLoading ? (
              <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.lg }} />
            ) : !plans?.length ? (
              <EmptyState pose="cheer" title="No plans yet"
                message="Create a workout plan, diet plan or membership. Clients can buy it from your profile in the Paasxo app." />
            ) : plans.map((p) => (
              <Card key={p.id} style={[s.planCard, !p.active && { opacity: 0.6 }]}>
                <TouchableOpacity style={s.planTop} onPress={() => setEditor({ plan: p })} activeOpacity={0.8}>
                  <View style={[s.planIcon, { backgroundColor: palette.accentLight }]}>
                    <Ionicons name={TYPE_META[p.type].icon} size={20} color={palette.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.planType}>{TYPE_META[p.type].label.toUpperCase()}</Text>
                    <Text style={s.planTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={s.planMeta}>{describe(p)}</Text>
                  </View>
                  <Ionicons name="create-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {p.personalised && (
                  <View style={[s.tailorPill, { backgroundColor: palette.accentLight }]}>
                    <Ionicons name="person-outline" size={12} color={palette.accent} />
                    <Text style={[s.tailorText, { color: palette.accent }]}>Tailored for each client</Text>
                  </View>
                )}
                <View style={s.planBottom}>
                  <Text style={s.planMeta}>
                    {p.activeBuyers ?? 0} active {p.type === 'MEMBERSHIP' ? 'member' : 'client'}{(p.activeBuyers ?? 0) === 1 ? '' : 's'}
                  </Text>
                  <View style={s.switchRow}>
                    <Text style={s.planMeta}>{p.active ? 'On sale' : 'Hidden'}</Text>
                    <Switch
                      value={p.active}
                      onValueChange={(v) => toggle.mutate({ id: p.id, active: v })}
                      trackColor={{ true: palette.accent, false: colors.border }}
                    />
                  </View>
                </View>
                {p.type !== 'MEMBERSHIP' && (
                  <TouchableOpacity style={[s.assignBtn, { borderColor: palette.accent }]} onPress={() => setAssigning(p)} accessibilityRole="button">
                    <Ionicons name="person-add-outline" size={16} color={palette.accent} />
                    <Text style={[s.assignText, { color: palette.accent }]}>Give to a client</Text>
                  </TouchableOpacity>
                )}
              </Card>
            ))}
          </>
        ) : loadingSales ? (
          <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.lg }} />
        ) : !sales?.length ? (
          <EmptyState pose="sit" title="No clients yet" message="When someone buys one of your plans, or you give a plan to a client, they'll appear here." />
        ) : sales.map((x) => {
          const editable = x.status === 'ACTIVE' && x.planType !== 'MEMBERSHIP';
          const waiting = editable && !x.personalContent && (x.personalised || x.assignedByTrainer);
          return (
            <TouchableOpacity key={x.id} activeOpacity={editable ? 0.8 : 1} disabled={!editable} onPress={() => setClientPlan(x)}>
              <Card style={s.saleCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.planTitle} numberOfLines={1}>{x.buyerDisplayName ?? 'Client'}</Text>
                  <Text style={s.planMeta} numberOfLines={1}>{x.planTitle}</Text>
                  <Text style={s.planMeta}>
                    {new Date(x.purchasedAt).toLocaleDateString()} · until {new Date(x.expiresAt).toLocaleDateString()}
                  </Text>
                  {editable && (
                    <View style={s.personalRow}>
                      <Ionicons
                        name={x.personalContent ? 'checkmark-circle' : waiting ? 'alert-circle' : 'create-outline'}
                        size={14}
                        color={x.personalContent ? colors.success : waiting ? colors.warning : palette.accent}
                      />
                      <Text style={[s.personalText, { color: x.personalContent ? colors.success : waiting ? colors.warning : palette.accent }]}>
                        {x.personalContent
                          ? `Personal plan sent${x.personalUpdatedAt ? ` · ${new Date(x.personalUpdatedAt).toLocaleDateString()}` : ''}`
                          : waiting ? 'Waiting for their personal plan' : 'Write a personal plan'}
                      </Text>
                    </View>
                  )}
                  {!!x.clientNote && <Text style={s.clientNote} numberOfLines={2}>“{x.clientNote}”</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.amount}>{x.assignedByTrainer ? 'Given' : x.pricePaid > 0 ? `LKR ${Number(x.pricePaid).toLocaleString()}` : 'Free'}</Text>
                  <Text style={[s.status, { color: x.status === 'ACTIVE' ? colors.success : colors.danger }]}>
                    {x.status === 'ACTIVE' ? 'Active' : 'Cancelled'}
                  </Text>
                  {editable && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 6 }} />}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <PlanEditor
        visible={!!editor}
        plan={editor?.plan}
        accent={palette.accent}
        onClose={() => setEditor(null)}
        onSaved={() => { setEditor(null); queryClient.invalidateQueries({ queryKey: ['trainer-plans'] }); }}
      />

      <ClientPlanEditor
        sale={clientPlan}
        accent={palette.accent}
        onClose={() => setClientPlan(null)}
        onSaved={() => { setClientPlan(null); queryClient.invalidateQueries({ queryKey: ['trainer-plans'] }); }}
      />

      <AssignPlanSheet
        plan={assigning}
        accent={palette.accent}
        onClose={() => setAssigning(null)}
        onAssigned={(name) => {
          setAssigning(null);
          queryClient.invalidateQueries({ queryKey: ['trainer-plans'] });
          Alert.alert('Plan sent', `${name} has been notified and can open it in the Paasxo app.`);
        }}
      />
    </View>
  );
}

/** Write or update the plan for one client (their own diet/workout plan). */
function ClientPlanEditor({ sale, accent, onClose, onSaved }: {
  sale: TrainerPlanSale | null; accent: string; onClose: () => void; onSaved: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  React.useEffect(() => { if (sale) setContent(sale.personalContent ?? ''); }, [sale]);

  const save = async () => {
    if (!sale) return;
    if (!content.trim()) return Alert.alert('Write the plan', 'Add the plan for this client before saving.');
    setBusy(true);
    try {
      await TrainerApi.updatePersonalPlan(sale.id, content.trim());
      onSaved();
    } catch (e) {
      Alert.alert('Could not save', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!sale} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.sheet} edges={['top', 'bottom']}>
        <View style={s.sheetHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={10}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.sheetTitle} numberOfLines={1}>{sale?.buyerDisplayName ?? 'Client'}</Text>
          <TouchableOpacity onPress={save} disabled={busy} hitSlop={10}>
            {busy ? <ActivityIndicator color={accent} /> : <Text style={[s.saveText, { color: accent }]}>{sale?.personalContent ? 'Update' : 'Send'}</Text>}
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
            <Text style={s.planType}>{sale ? TYPE_META[sale.planType].label.toUpperCase() : ''}</Text>
            <Text style={s.planTitle}>{sale?.planTitle}</Text>

            <Text style={s.label}>From your client</Text>
            <View style={s.noteBox}>
              <Text style={sale?.clientNote ? s.noteText : s.hint}>
                {sale?.clientNote || 'They haven’t added goals or allergies yet. They can add them from the plan in the Paasxo app.'}
              </Text>
            </View>

            <Text style={s.label}>Their plan (only they can see it)</Text>
            <TextInput style={[s.input, s.bigArea, { minHeight: 260 }]} value={content} onChangeText={setContent} maxLength={20000} multiline
              placeholder={sale?.planType === 'DIET'
                ? 'Daily target: 1,900 kcal · 140 g protein\nBreakfast: …\nLunch: …\nDinner: …\nSnacks: …'
                : 'Week 1\nDay 1 – …\nDay 2 – …'}
              placeholderTextColor={colors.textMuted} />
            <Text style={s.hint}>They get a notification each time you send an update.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/** Give a workout/diet plan to one of your customers (people who booked your sessions or bought a plan). */
function AssignPlanSheet({ plan, accent, onClose, onAssigned }: {
  plan: TrainerPlan | null; accent: string; onClose: () => void; onAssigned: (name: string) => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [picked, setPicked] = useState<TrainerCustomer | null>(null);
  const [query, setQuery] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const { data: customers, isLoading, isError, refetch } = useQuery({
    queryKey: ['trainer-plans', 'customers'], queryFn: TrainerApi.getPlanCustomers, enabled: !!plan,
  });

  React.useEffect(() => { if (plan) { setPicked(null); setQuery(''); setContent(''); } }, [plan]);

  const list = (customers ?? []).filter((c) =>
    !query.trim() || (c.displayName ?? '').toLowerCase().includes(query.trim().toLowerCase()));

  const assign = async () => {
    if (!plan || !picked) return;
    setBusy(true);
    try {
      await TrainerApi.assignPlan(plan.id, picked.firebaseUid, content.trim() || undefined);
      onAssigned(picked.displayName ?? 'Your client');
    } catch (e) {
      Alert.alert('Could not give plan', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!plan} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.sheet} edges={['top', 'bottom']}>
        <View style={s.sheetHeader}>
          <TouchableOpacity onPress={picked ? () => setPicked(null) : onClose} hitSlop={10}>
            <Text style={s.cancel}>{picked ? 'Back' : 'Cancel'}</Text>
          </TouchableOpacity>
          <Text style={s.sheetTitle} numberOfLines={1}>{picked ? picked.displayName ?? 'Client' : 'Give to a client'}</Text>
          {picked ? (
            <TouchableOpacity onPress={assign} disabled={busy} hitSlop={10}>
              {busy ? <ActivityIndicator color={accent} /> : <Text style={[s.saveText, { color: accent }]}>Give plan</Text>}
            </TouchableOpacity>
          ) : <View style={{ width: 50 }} />}
        </View>

        {!picked ? (
          <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
            <Text style={s.hint}>{plan?.title} — free for the client. Only people who’ve trained with you are listed.</Text>
            <TextInput style={[s.input, { marginTop: spacing.md }]} value={query} onChangeText={setQuery}
              placeholder="Search clients" placeholderTextColor={colors.textMuted} autoCorrect={false} />
            {isLoading ? (
              <ActivityIndicator color={accent} style={{ marginTop: spacing.lg }} />
            ) : isError ? (
              <TouchableOpacity onPress={() => refetch()} style={{ marginTop: spacing.lg, alignItems: 'center' }}>
                <Text style={s.hint}>Couldn’t load your clients.</Text>
                <Text style={[s.saveText, { color: accent, marginTop: 6 }]}>Try again</Text>
              </TouchableOpacity>
            ) : !list.length ? (
              <Text style={[s.hint, { marginTop: spacing.lg, textAlign: 'center' }]}>
                {query.trim() ? 'No one matches that name.' : 'No clients yet — people who book your sessions appear here.'}
              </Text>
            ) : list.map((c) => {
              const has = !!plan && c.activePlanIds.includes(plan.id);
              return (
                <TouchableOpacity key={c.firebaseUid} disabled={has} onPress={() => setPicked(c)}
                  style={[s.customerRow, has && { opacity: 0.45 }]} accessibilityRole="button">
                  <View style={[s.avatar, { backgroundColor: accent + '22' }]}>
                    <Text style={[s.avatarText, { color: accent }]}>{(c.displayName || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.customerName} numberOfLines={1}>{c.displayName ?? 'Client'}</Text>
                    <Text style={s.planMeta}>{has ? 'Already has this plan' : c.sessionCustomer ? 'Booked your sessions' : 'Has one of your plans'}</Text>
                  </View>
                  {!has && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
              <Text style={s.label}>Their plan (optional — you can write it later)</Text>
              <TextInput style={[s.input, s.bigArea, { minHeight: 260 }]} value={content} onChangeText={setContent} maxLength={20000} multiline
                placeholder={plan?.type === 'DIET' ? 'Breakfast: …\nLunch: …\nDinner: …' : 'Week 1\nDay 1 – …'}
                placeholderTextColor={colors.textMuted} />
              <Text style={s.hint}>
                {picked.displayName ?? 'They'} also get the plan’s general content{plan?.content ? '' : ' (none yet)'}. They’re notified straight away.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function PlanEditor({ visible, plan, accent, onClose, onSaved }: {
  visible: boolean; plan?: TrainerPlan; accent: string; onClose: () => void; onSaved: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => createStyles(colors), [colors]);
  const [type, setType] = useState<TrainerPlanType>('WORKOUT');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [weeks, setWeeks] = useState('4');
  const [period, setPeriod] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
  const [personalised, setPersonalised] = useState(false);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setType(plan?.type ?? 'WORKOUT');
    setTitle(plan?.title ?? '');
    setSummary(plan?.summary ?? '');
    setContent(plan?.content ?? '');
    setPrice(plan?.price ? String(plan.price) : '');
    setWeeks(plan?.durationWeeks ? String(plan.durationWeeks) : '4');
    setPeriod(plan?.billingPeriod ?? 'MONTHLY');
    setPersonalised(!!plan?.personalised);
  }, [visible, plan]);

  const save = async () => {
    const priceNum = price.trim() ? Number(price) : null;
    if (title.trim().length < 3) return Alert.alert('Add a title', 'Give the plan a title (at least 3 characters).');
    if (priceNum != null && (!Number.isFinite(priceNum) || priceNum < 0)) return Alert.alert('Check the price', 'Enter a valid price.');
    if (priceNum != null && priceNum > 0 && priceNum < 50) return Alert.alert('Check the price', 'Paid plans must cost at least LKR 50.');
    if (type === 'MEMBERSHIP' && !(priceNum && priceNum > 0)) return Alert.alert('Add a price', 'A membership needs a price.');
    const w = parseInt(weeks, 10);
    if (type !== 'MEMBERSHIP' && !(w >= 1 && w <= 52)) return Alert.alert('Check the length', 'Plan length must be 1–52 weeks.');
    const payload: TrainerPlanPayload = {
      type, title: title.trim(), summary: summary.trim() || undefined, content: content.trim() || undefined,
      price: priceNum, durationWeeks: type === 'MEMBERSHIP' ? null : w, billingPeriod: type === 'MEMBERSHIP' ? period : null,
      personalised: type !== 'MEMBERSHIP' && personalised,
    };
    setBusy(true);
    try {
      if (plan) await TrainerApi.updatePlan(plan.id, payload);
      else await TrainerApi.createPlan(payload);
      onSaved();
    } catch (e) {
      Alert.alert('Could not save plan', errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.sheet} edges={['top', 'bottom']}>
        <View style={s.sheetHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={10}><Text style={s.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={s.sheetTitle}>{plan ? 'Edit plan' : 'New plan'}</Text>
          <TouchableOpacity onPress={save} disabled={busy} hitSlop={10}>
            {busy ? <ActivityIndicator color={accent} /> : <Text style={[s.saveText, { color: accent }]}>Save</Text>}
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Type</Text>
            <View style={s.typeRow}>
              {(Object.keys(TYPE_META) as TrainerPlanType[]).map((t) => {
                const on = type === t;
                const locked = !!plan && plan.type !== t;
                return (
                  <TouchableOpacity key={t} disabled={locked} onPress={() => setType(t)}
                    style={[s.typeChip, on && { borderColor: accent, backgroundColor: accent + '18' }, locked && { opacity: 0.35 }]}>
                    <Ionicons name={TYPE_META[t].icon} size={18} color={on ? accent : colors.textMuted} />
                    <Text style={[s.typeText, on && { color: accent }]}>{TYPE_META[t].label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={s.hint}>{TYPE_META[type].hint}</Text>

            <Text style={s.label}>Title</Text>
            <TextInput style={s.input} value={title} onChangeText={setTitle} maxLength={80}
              placeholder={type === 'DIET' ? 'e.g. 8-week lean meal plan' : type === 'MEMBERSHIP' ? 'e.g. Unlimited monthly' : 'e.g. 12-week strength programme'}
              placeholderTextColor={colors.textMuted} />

            <Text style={s.label}>Short description (shown to everyone)</Text>
            <TextInput style={[s.input, s.area]} value={summary} onChangeText={setSummary} maxLength={500} multiline
              placeholder="Who it's for and what they'll get" placeholderTextColor={colors.textMuted} />

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Price (LKR)</Text>
                <TextInput style={s.input} value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad" placeholder={type === 'MEMBERSHIP' ? '8000' : 'Free'} placeholderTextColor={colors.textMuted} />
              </View>
              {type === 'MEMBERSHIP' ? (
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Billing</Text>
                  <View style={s.periodRow}>
                    {(['MONTHLY', 'ANNUAL'] as const).map((p) => (
                      <TouchableOpacity key={p} onPress={() => setPeriod(p)}
                        style={[s.period, period === p && { backgroundColor: accent, borderColor: accent }]}>
                        <Text style={[s.periodText, period === p && { color: colors.white }]}>{p === 'MONTHLY' ? 'Monthly' : 'Annual'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Length (weeks)</Text>
                  <TextInput style={s.input} value={weeks} onChangeText={(t) => setWeeks(t.replace(/[^0-9]/g, '').slice(0, 2))}
                    keyboardType="number-pad" placeholderTextColor={colors.textMuted} />
                </View>
              )}
            </View>

            {type !== 'MEMBERSHIP' && (
              <View style={s.tailorRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { marginTop: 0 }]}>Tailor for each client</Text>
                  <Text style={s.hint}>
                    After someone buys, they tell you their goals and allergies, and you write their own {type === 'DIET' ? 'diet' : 'workout'} plan from your Clients tab.
                  </Text>
                </View>
                <Switch value={personalised} onValueChange={setPersonalised} trackColor={{ true: accent, false: colors.border }} />
              </View>
            )}

            <Text style={s.label}>
              {type === 'MEMBERSHIP' ? 'What members get (shown after joining)'
                : personalised ? 'General guidance every client gets (optional)' : 'The plan itself (unlocked after purchase)'}
            </Text>
            <TextInput style={[s.input, s.bigArea]} value={content} onChangeText={setContent} maxLength={20000} multiline
              placeholder={type === 'DIET'
                ? 'Week 1\nBreakfast: …\nLunch: …\nDinner: …'
                : type === 'WORKOUT'
                ? 'Week 1\nDay 1 – Lower body: squats 4×8, …\nDay 2 – …'
                : 'e.g. Join any of my sessions free, monthly check-in, WhatsApp support'}
              placeholderTextColor={colors.textMuted} />
            <Text style={s.hint}>Buyers can cancel within 24 hours for a full refund. You're paid after that.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  tab: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  tabText: { fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: radius.md, marginBottom: spacing.md },
  newText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  planCard: { padding: spacing.md },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  planIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  planType: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: colors.textMuted },
  planTitle: { ...typography.h3, fontSize: 16, color: colors.text },
  planMeta: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  planBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saleCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  amount: { fontWeight: '800', color: colors.text },
  status: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  sheet: { flex: 1, backgroundColor: colors.background },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cancel: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  saveText: { fontSize: 15, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeChip: {
    flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface,
  },
  typeText: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  input: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14.5, color: colors.text,
  },
  area: { minHeight: 70, textAlignVertical: 'top' },
  bigArea: { minHeight: 180, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: spacing.sm },
  periodRow: { flexDirection: 'row', gap: 6 },
  period: { flex: 1, height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  periodText: { fontWeight: '700', color: colors.text, fontSize: 13 },
  tailorPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginTop: spacing.sm },
  tailorText: { fontSize: 11.5, fontWeight: '700' },
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38,
    borderRadius: radius.md, borderWidth: 1, marginTop: spacing.sm,
  },
  assignText: { fontWeight: '700', fontSize: 13.5 },
  personalRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  personalText: { fontSize: 12.5, fontWeight: '700' },
  clientNote: { fontSize: 12.5, color: colors.text, marginTop: 4, fontStyle: 'italic' },
  noteBox: { borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 12 },
  noteText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  tailorRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, padding: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 16 },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.text },
});
