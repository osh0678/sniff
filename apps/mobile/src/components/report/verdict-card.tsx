import type { ProductReport } from '@sniff/core';
import { StyleSheet, View } from 'react-native';

import { WarningIcon } from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { Divider, Panel, Stamp, useToneColors } from '@/components/ui';
import { CAP_LABELS, RATING_LABELS } from '@/constants/labels';
import { IconSize, Radius, Spacing } from '@/constants/theme';

type VerdictCardProps = {
  report: ProductReport;
  reportId: string;
};

const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function VerdictCard({ report, reportId }: VerdictCardProps) {
  const { product, verdict } = report;
  const rating = RATING_LABELS[verdict.rating];
  const { fg, bg } = useToneColors(rating.tone);
  const productMeta = [product.brand, product.category, product.priceText].filter(Boolean).join(', ');

  return (
    <Panel>
      <View style={styles.fileRow}>
        <ThemedText variant="mono" color="inkMuted">
          검사 번호 {reportId.slice(0, 8).toUpperCase()}
        </ThemedText>
        <ThemedText variant="mono" color="inkMuted">
          {dateFormat.format(new Date(report.analyzedAt))}
        </ThemedText>
      </View>

      <View style={styles.product}>
        <ThemedText variant="title">{product.name}</ThemedText>
        {productMeta ? <ThemedText color="inkMuted">{productMeta}</ThemedText> : null}
      </View>

      <Divider />

      <View style={styles.verdictRow}>
        <View style={styles.scoreBlock} accessibilityLabel={`종합 점수 ${verdict.overallScore ?? '없음'}`}>
          <ThemedText variant="score" style={{ color: fg }}>
            {verdict.overallScore ?? '?'}
          </ThemedText>
          <ThemedText variant="mono" color="inkMuted">
            / 100
          </ThemedText>
        </View>
        <View style={styles.verdictText}>
          <Stamp label={rating.text} tone={rating.tone} icon={rating.icon} />
          <ThemedText variant="bodyStrong">{report.headline}</ThemedText>
        </View>
      </View>

      <ThemedText>{report.summary}</ThemedText>

      {verdict.caps.map((cap) => (
        <View key={cap} style={[styles.notice, { backgroundColor: bg }]}>
          <WarningIcon size={IconSize.small} color={fg} weight="bold" style={styles.noticeIcon} />
          <ThemedText variant="caption" style={[styles.flex, { color: fg }]}>
            {CAP_LABELS[cap]}
          </ThemedText>
        </View>
      ))}
    </Panel>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fileRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  product: { gap: Spacing.one },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.five },
  scoreBlock: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  verdictText: { flex: 1, gap: Spacing.two },
  notice: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.control,
  },
  noticeIcon: { marginTop: 2 },
});
