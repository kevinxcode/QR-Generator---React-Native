import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { PressableScale, Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import type { CodeRecord } from '@/types/domain';
import { codeFormatLabel, codeSummary, featureFor, relativeDate, typeMeta } from '@/utils/format';

interface Props {
  item: CodeRecord;
  onToggleFavorite?(item: CodeRecord): void;
  onDelete?(item: CodeRecord): void;
  compact?: boolean;
}

export const CodeListItem = memo(function CodeListItem({ item, onToggleFavorite, onDelete, compact }: Props) {
  const p = useTheme();
  const meta = typeMeta(item.contentType);
  const tone = p.feature[featureFor(item.contentType)];
  const swipe = useRef<SwipeableMethods>(null);
  const summary = codeSummary(item);
  const sourceIcon = item.source === 'scanned' ? 'scan-outline' : item.source === 'imported' ? 'download-outline' : 'sparkles-outline';

  const row = (
    <PressableScale
      onPress={() => router.push({ pathname: '/code/[id]', params: { id: item.id } })}
      scaleTo={0.985}
      accessibilityLabel={`${meta.label}, ${summary}, ${item.source === 'scanned' ? 'scanned' : 'created'} ${relativeDate(item.createdAt)}${item.isFavorite ? ', favorite' : ''}`}
      accessibilityHint="Opens details. Swipe for favorite or delete."
      style={[styles.row, { backgroundColor: p.surface, borderColor: p.border, paddingVertical: compact ? 10 : 12 }]}
    >
      <View style={[styles.icon, { backgroundColor: tone.tint }]}>
        <Ionicons name={meta.icon} size={20} color={tone.color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {summary || '(empty)'}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name={sourceIcon} size={12} color={p.textFaint} />
          <Text variant="caption" color="faint" numberOfLines={1}>
            {meta.label} · {codeFormatLabel(item)} · {relativeDate(item.createdAt)}
          </Text>
        </View>
      </View>
      {onToggleFavorite ? (
        <PressableScale
          haptic
          scaleTo={0.8}
          onPress={() => onToggleFavorite(item)}
          accessibilityLabel={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          style={styles.fav}
        >
          <Ionicons name={item.isFavorite ? 'star' : 'star-outline'} size={20} color={item.isFavorite ? '#F5B301' : p.textFaint} />
        </PressableScale>
      ) : item.isFavorite ? (
        <Ionicons name="star" size={16} color="#F5B301" accessibilityLabel="Favorite" />
      ) : null}
    </PressableScale>
  );

  if (!onDelete && !onToggleFavorite) return row;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} layout={LinearTransition.duration(200)}>
      <ReanimatedSwipeable
        ref={swipe}
        friction={1.6}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={() =>
          onToggleFavorite ? (
            <PressableScale
              onPress={() => {
                swipe.current?.close();
                onToggleFavorite(item);
              }}
              accessibilityLabel={item.isFavorite ? 'Unfavorite' : 'Favorite'}
              style={[styles.action, { backgroundColor: '#F5B301' }]}
            >
              <Ionicons name={item.isFavorite ? 'star-outline' : 'star'} size={22} color="#fff" />
            </PressableScale>
          ) : null
        }
        renderRightActions={() =>
          onDelete ? (
            <PressableScale
              onPress={() => {
                swipe.current?.close();
                onDelete(item);
              }}
              accessibilityLabel="Delete"
              style={[styles.action, { backgroundColor: p.danger }]}
            >
              <Ionicons name="trash" size={22} color="#fff" />
            </PressableScale>
          ) : null
        }
      >
        {row}
      </ReanimatedSwipeable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fav: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  action: { width: 76, marginHorizontal: 4, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
