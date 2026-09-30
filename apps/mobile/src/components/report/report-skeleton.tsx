import { useEffect } from 'react';
import { ScrollView, StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import {
  ChatCircleTextIcon,
  FlaskIcon,
  MegaphoneIcon,
  TagIcon,
  type Icon,
} from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { Panel } from '@/components/ui';
import { IconSize, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PULSE_MS = 900;

const CHECKS: readonly { icon: Icon; label: string }[] = [
  { icon: ChatCircleTextIcon, label: '리뷰 모으고 협찬 신호 걸러내기' },
  { icon: MegaphoneIcon, label: '광고 주장과 근거 대조하기' },
  { icon: FlaskIcon, label: '성분 확인하기' },
  { icon: TagIcon, label: '비슷한 제품과 가격 비교하기' },
];

function Bone({ width, height = 14 }: { width: DimensionValue; height?: number }) {
  const theme = useTheme();
  return <View style={{ width, height, borderRadius: Radius.stamp, backgroundColor: theme.sunken }} />;
}

/** Shows what is being inspected, over a placeholder shaped like the final report. */
export function ReportSkeleton({ query }: { query: string }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: PULSE_MS }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <ScrollView contentContainerStyle={styles.content} accessibilityLabel="검사 중">
      <View style={styles.header}>
        <ThemedText variant="title">검사하고 있어요</ThemedText>
        {query ? (
          <ThemedText variant="mono" color="inkMuted" numberOfLines={2}>
            {query}
          </ThemedText>
        ) : null}
        <ThemedText color="inkMuted">웹에서 근거를 찾는 중이라 보통 1~3분 걸려요.</ThemedText>
      </View>

      <Panel>
        {CHECKS.map(({ icon: CheckIcon, label }) => (
          <View key={label} style={styles.check}>
            <CheckIcon size={IconSize.medium} color={theme.inkMuted} />
            <ThemedText style={styles.flex}>{label}</ThemedText>
          </View>
        ))}
      </Panel>

      <Animated.View style={[styles.bones, pulse]} importantForAccessibility="no-hide-descendants">
        <Panel>
          <Bone width="40%" height={12} />
          <Bone width="70%" height={22} />
          <View style={styles.row}>
            <Bone width={72} height={52} />
            <View style={[styles.flex, styles.stack]}>
              <Bone width={96} height={22} />
              <Bone width="90%" />
            </View>
          </View>
        </Panel>
        <Panel>
          <Bone width="35%" height={18} />
          <Bone width="100%" height={6} />
          <Bone width="100%" height={6} />
        </Panel>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingTop: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { gap: Spacing.two },
  check: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bones: { gap: Spacing.four },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  stack: { gap: Spacing.two },
});
