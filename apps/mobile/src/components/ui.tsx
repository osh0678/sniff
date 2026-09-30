import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type ViewProps } from 'react-native';

import type { Icon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { HairlineWidth, IconSize, Radius, Spacing, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function useToneColors(tone: Tone): { fg: string; bg: string } {
  const theme = useTheme();
  return { fg: theme[tone], bg: theme[`${tone}Soft`] };
}

export function Panel({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.line }, style]}
      {...rest}
    />
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: HairlineWidth, backgroundColor: theme.line }} />;
}

type SectionProps = {
  icon: Icon;
  title: string;
  /** Right-aligned mono meta, e.g. "3건". */
  meta?: string;
  caption?: string;
  children: ReactNode;
};

/** A report section: icon + title header, optional summary, then findings. */
export function Section({ icon: SectionIcon, title, meta, caption, children }: SectionProps) {
  const theme = useTheme();
  return (
    <Panel>
      <View style={styles.sectionHeader}>
        <SectionIcon size={IconSize.medium} color={theme.ink} />
        <ThemedText variant="heading" style={styles.flex}>
          {title}
        </ThemedText>
        {meta ? (
          <ThemedText variant="mono" color="inkMuted">
            {meta}
          </ThemedText>
        ) : null}
      </View>
      {caption ? <ThemedText color="inkMuted">{caption}</ThemedText> : null}
      <View style={styles.sectionBody}>{children}</View>
    </Panel>
  );
}

type StampProps = {
  label: string;
  tone: Tone;
  icon?: Icon;
};

/** Inspection stamp: bordered, square-cornered verdict tag. */
export function Stamp({ label, tone, icon: StampIcon }: StampProps) {
  const { fg, bg } = useToneColors(tone);
  return (
    <View style={[styles.stamp, { borderColor: fg, backgroundColor: bg }]}>
      {StampIcon ? <StampIcon size={IconSize.small} color={fg} weight="bold" /> : null}
      <ThemedText variant="label" style={{ color: fg }}>
        {label}
      </ThemedText>
    </View>
  );
}

const METER_SEGMENTS = 10;

type MeterProps = {
  label: string;
  score: number | null;
  tone: Tone;
  rationale: string;
};

/** Ten-step gauge; reads like an instrument, not a progress bar. */
export function Meter({ label, score, tone, rationale }: MeterProps) {
  const theme = useTheme();
  const { fg } = useToneColors(tone);
  const filled = score === null ? 0 : Math.round(score / METER_SEGMENTS);

  return (
    <View style={styles.meter}>
      <View style={styles.meterHeader}>
        <ThemedText variant="bodyStrong" style={styles.flex}>
          {label}
        </ThemedText>
        <ThemedText variant="mono" style={[styles.meterScore, { color: fg }]}>
          {score === null ? '판정 보류' : `${score}/100`}
        </ThemedText>
      </View>
      <View style={styles.segments} accessibilityLabel={`${label} ${score ?? '판정 보류'}`}>
        {Array.from({ length: METER_SEGMENTS }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, { backgroundColor: index < filled ? fg : theme.sunken }]}
          />
        ))}
      </View>
      {rationale ? (
        <ThemedText variant="caption" color="inkMuted">
          {rationale}
        </ThemedText>
      ) : null}
    </View>
  );
}

type FindingListProps = {
  items: readonly string[];
  icon: Icon;
  tone: Tone;
};

export function FindingList({ items, icon: ItemIcon, tone }: FindingListProps) {
  const { fg } = useToneColors(tone);
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.listRow}>
          <ItemIcon size={IconSize.small} color={fg} weight="bold" style={styles.listIcon} />
          <ThemedText style={styles.flex}>{item}</ThemedText>
        </View>
      ))}
    </View>
  );
}

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  trailingIcon?: Icon;
};

export function PrimaryButton({ label, trailingIcon: TrailingIcon, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        { backgroundColor: theme.accent, opacity: disabled ? 0.45 : 1 },
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <ThemedText variant="bodyStrong" style={{ color: theme.onAccent }}>
        {label}
      </ThemedText>
      {TrailingIcon ? <TrailingIcon size={IconSize.small} color={theme.onAccent} weight="bold" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: {
    borderRadius: Radius.panel,
    borderWidth: HairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionBody: { gap: Spacing.four },
  stamp: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.stamp,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  meter: { gap: Spacing.two },
  meterHeader: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  meterScore: { fontSize: 13 },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 6, borderRadius: 1 },
  list: { gap: Spacing.two },
  listRow: { flexDirection: 'row', gap: Spacing.two },
  listIcon: { marginTop: 3 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    minHeight: 52,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.five,
  },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
});
