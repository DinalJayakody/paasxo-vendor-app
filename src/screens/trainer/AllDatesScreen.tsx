import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { radius, spacing, typography, ThemeColors } from '@/theme';
import { useTheme } from '@/context/ThemeContext';
import { useRoleTheme } from '@/hooks/useRoleTheme';
import { TrainerApi } from '@/api/trainer';
import { TrainerSlotOverview } from '@/types';
import Card from '@/components/Card';
import ScreenHeader from '@/components/ScreenHeader';
import EmptyState from '@/components/EmptyState';
import CalendarPickerModal from '@/components/CalendarPickerModal';
import ScreenGlow from '@/components/ScreenGlow';

const PAGE_SIZE = 20;
// Matches FeedScreen/LikesModal's own search-as-you-type delay elsewhere in
// this product — long enough a fast typist doesn't fire a request per
// keystroke, short enough the list still feels live.
const SEARCH_DEBOUNCE_MS = 350;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function timeLabel(t: string) {
  return t.slice(0, 5);
}
function dateLabel(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function AllDatesScreen({ navigation }: any) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const palette = useRoleTheme();

  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<TrainerSlotOverview[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const momentumRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchText.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchText]);

  // Resets pagination back to page 0 whenever either filter changes — the
  // query itself (below) then fetches that fresh first page.
  useEffect(() => {
    setPage(0);
    setItems([]);
    setHasMore(true);
  }, [debouncedQuery, dateFilter]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['trainer-all-dates', debouncedQuery, dateFilter, page],
    queryFn: () => TrainerApi.getAllUpcomingSlots({
      query: debouncedQuery || undefined,
      date: dateFilter || undefined,
      page,
      size: PAGE_SIZE,
    }),
  });

  // Appends page>0 results; page 0 (a fresh search/filter) replaces outright —
  // mirrors usePaginatedList's own append-vs-replace split on the User app side.
  useEffect(() => {
    if (!data) return;
    setItems((prev) => (page === 0 ? data.content : [...prev, ...data.content]));
    setHasMore(data.hasMore);
    setLoadingMore(false);
  }, [data, page]);

  const loadMore = useCallback(() => {
    if (!hasMore || isFetching) return;
    setLoadingMore(true);
    setPage((p) => p + 1);
  }, [hasMore, isFetching]);

  const openRoster = (item: TrainerSlotOverview) => {
    navigation.navigate('SessionRoster', {
      sessionId: item.sessionId,
      slotId: item.slotId,
      slotDate: item.slotDate,
    });
  };

  const showingInitialLoad = isLoading && page === 0 && items.length === 0;

  return (
    <View style={styles.safe}>
      <ScreenGlow />
      <ScreenHeader
        title="All Dates"
        subtitle="Every upcoming date across your sessions"
        compact
        heroColors={[palette.heroStart, palette.heroMid, palette.heroEnd]}
      />

      <View style={styles.filterBar}>
        <View style={styles.searchField}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by session name"
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {!!searchText && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.dateBtn, dateFilter && { borderColor: palette.accent, backgroundColor: palette.accentLight }]}
          onPress={() => setCalendarVisible(true)}
        >
          <Ionicons name="calendar-outline" size={16} color={dateFilter ? palette.accent : colors.textMuted} />
          {dateFilter && (
            <TouchableOpacity onPress={() => setDateFilter(null)} hitSlop={8} style={styles.dateClear}>
              <Ionicons name="close" size={12} color={palette.accent} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
      {!!dateFilter && (
        <Text style={[styles.dateFilterLabel, { color: palette.accent }]}>Showing {dateLabel(dateFilter)} only</Text>
      )}

      {showingInitialLoad ? (
        <ActivityIndicator color={palette.accent} style={{ marginTop: spacing.lg }} />
      ) : items.length === 0 ? (
        <EmptyState
          pose="sit"
          title="No dates found"
          message={debouncedQuery || dateFilter ? 'Try a different search or date.' : 'Dates you generate will show up here.'}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.slotId)}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!momentumRef.current) {
              momentumRef.current = true;
              loadMore();
            }
          }}
          onMomentumScrollBegin={() => { momentumRef.current = false; }}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={palette.accent} style={{ marginVertical: spacing.md }} /> : null}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.duration(300).delay(Math.min(index, 8) * 40).springify()}>
              <TouchableOpacity activeOpacity={0.88} onPress={() => openRoster(item)}>
                <Card style={styles.row}>
                  <View style={[styles.dateBadge, { backgroundColor: palette.accentLight }]}>
                    <Text style={[styles.dateBadgeDay, { color: palette.accent }]}>{item.slotDate.slice(8, 10)}</Text>
                    <Text style={[styles.dateBadgeMonth, { color: palette.accent }]}>{item.slotDate.slice(5, 7)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>{item.sessionTitle}</Text>
                    <Text style={styles.sessionMeta}>
                      {timeLabel(item.startTime)}–{timeLabel(item.endTime)} ·{' '}
                      {item.status === 'FULL' ? 'Full' : `${item.spotsLeft} of ${item.capacity} spots left`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Card>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}

      <CalendarPickerModal
        visible={calendarVisible}
        selectedDate={dateFilter ?? todayIso()}
        minDate={todayIso()}
        onClose={() => setCalendarVisible(false)}
        onSelect={(date) => {
          setDateFilter(date);
          setCalendarVisible(false);
        }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  filterBar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  searchField: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  dateBtn: {
    width: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  dateClear: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.background, borderRadius: 8 },
  dateFilterLabel: { fontSize: 12, fontWeight: '700', paddingHorizontal: spacing.md, marginTop: spacing.xs },
  listContent: { padding: spacing.md, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dateBadgeDay: { fontWeight: '800', fontSize: 15, lineHeight: 18 },
  dateBadgeMonth: { fontWeight: '600', fontSize: 10, textTransform: 'uppercase' },
  sessionTitle: { fontWeight: '700', color: colors.text, fontSize: 14.5 },
  sessionMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
