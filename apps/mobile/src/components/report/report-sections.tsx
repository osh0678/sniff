import type { ProductReport } from '@sniff/core';
import * as WebBrowser from 'expo-web-browser';
import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  ArrowSquareOutIcon,
  ChatCircleTextIcon,
  FlaskIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  MinusIcon,
  PlusIcon,
  TagIcon,
  WarningIcon,
} from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { Divider, FindingList, Meter, Section, Stamp } from '@/components/ui';
import {
  CLAIM_LABELS,
  CONCERN_LABELS,
  SOURCE_TYPE_LABELS,
  STANCE_LABELS,
  SUBSCORE_LABELS,
  toneForScore,
} from '@/constants/labels';
import { IconSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ReportProps = {
  report: ProductReport;
};

const SUBSCORE_KEYS = ['reviews', 'adHonesty', 'ingredients', 'value'] as const;

export function SubscoresSection({ report }: ReportProps) {
  const keys = report.ingredients.applicable
    ? SUBSCORE_KEYS
    : SUBSCORE_KEYS.filter((key) => key !== 'ingredients');

  return (
    <Section icon={TagIcon} title="항목별 판정">
      {keys.map((key) => {
        const { score, rationale } = report.subscores[key];
        return (
          <Meter
            key={key}
            label={SUBSCORE_LABELS[key]}
            score={score}
            tone={toneForScore(score)}
            rationale={rationale}
          />
        );
      })}
      <Meter
        label={SUBSCORE_LABELS.sourceReliability}
        score={report.sourceReliability.score}
        tone={toneForScore(report.sourceReliability.score)}
        rationale={
          report.sourceReliability.communityFound
            ? '쇼핑몰·블로그·커뮤니티 등 출처의 다양성과 협찬 신호로 계산했어요.'
            : '커뮤니티에서 확인된 후기가 없어 출처 다양성이 낮게 반영됐어요.'
        }
      />
    </Section>
  );
}

export function AdClaimsSection({ report }: ReportProps) {
  const claims = report.adClaims;
  return (
    <Section
      icon={MegaphoneIcon}
      title="광고 주장 검증"
      meta={`${claims.length}건`}
      caption={claims.length === 0 ? '검증할 만한 효능 주장을 찾지 못했어요.' : undefined}>
      {claims.map((claim, index) => {
        const label = CLAIM_LABELS[claim.assessment];
        return (
          <Fragment key={claim.claim}>
            {index > 0 ? <Divider /> : null}
            <View style={styles.finding}>
              <Stamp label={label.text} tone={label.tone} icon={label.icon} />
              <ThemedText variant="bodyStrong">“{claim.claim}”</ThemedText>
              <ThemedText variant="caption" color="inkMuted">
                {claim.explanation}
              </ThemedText>
            </View>
          </Fragment>
        );
      })}
    </Section>
  );
}

export function ReviewsSection({ report }: ReportProps) {
  const { summary, pros, cons, authenticityFlags, communityFindings } = report.reviews;
  return (
    <Section icon={ChatCircleTextIcon} title="리뷰 분석" caption={summary}>
      {pros.length > 0 ? <FindingList items={pros} icon={PlusIcon} tone="pass" /> : null}
      {cons.length > 0 ? <FindingList items={cons} icon={MinusIcon} tone="fail" /> : null}
      <View style={styles.group}>
        <ThemedText variant="label" color="inkMuted">
          커뮤니티에서 확인한 의견
        </ThemedText>
        {communityFindings.length === 0 ? (
          <ThemedText variant="caption" color="inkMuted">
            클리앙·디시인사이드 등 커뮤니티에서 근거를 찾지 못했어요.
          </ThemedText>
        ) : (
          communityFindings.map((finding) => {
            const label = STANCE_LABELS[finding.stance];
            return (
              <View key={finding.community + finding.summary} style={styles.finding}>
                <View style={styles.row}>
                  <ThemedText variant="bodyStrong" style={styles.flex}>
                    {finding.community}
                  </ThemedText>
                  <Stamp label={label.text} tone={label.tone} icon={label.icon} />
                </View>
                <ThemedText variant="caption" color="inkMuted">
                  {finding.summary}
                </ThemedText>
              </View>
            );
          })
        )}
      </View>
      {authenticityFlags.length > 0 ? (
        <View style={styles.group}>
          <ThemedText variant="label" color="inkMuted">
            신뢰도를 낮춘 신호
          </ThemedText>
          <FindingList items={authenticityFlags} icon={WarningIcon} tone="caution" />
        </View>
      ) : null}
    </Section>
  );
}

export function IngredientsSection({ report }: ReportProps) {
  const { applicable, summary, items } = report.ingredients;
  if (!applicable) return null;

  return (
    <Section icon={FlaskIcon} title="성분 분석" meta={`${items.length}종`} caption={summary}>
      {items.map((item, index) => {
        const label = CONCERN_LABELS[item.concern];
        const detail = [item.purpose, item.note].filter(Boolean).join('. ');
        return (
          <Fragment key={item.name}>
            {index > 0 ? <Divider /> : null}
            <View style={styles.finding}>
              <View style={styles.row}>
                <ThemedText variant="bodyStrong" style={styles.flex}>
                  {item.name}
                </ThemedText>
                <Stamp label={label.text} tone={label.tone} />
              </View>
              {detail ? (
                <ThemedText variant="caption" color="inkMuted">
                  {detail}
                </ThemedText>
              ) : null}
            </View>
          </Fragment>
        );
      })}
    </Section>
  );
}

function hostnameOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.hostname.replace(/^www\./, '')
      : null;
  } catch {
    return null;
  }
}

export function SourcesSection({ report }: ReportProps) {
  const theme = useTheme();
  // Links come from web research; only open plain web URLs.
  const sources = report.sources.flatMap((source) => {
    const host = hostnameOf(source.url);
    return host ? [{ ...source, host }] : [];
  });
  if (sources.length === 0) return null;

  return (
    <Section icon={MagnifyingGlassIcon} title="근거 출처" meta={`${sources.length}곳`}>
      {sources.map((source) => (
        <Pressable
          key={source.url}
          accessibilityRole="link"
          onPress={() => void WebBrowser.openBrowserAsync(source.url)}
          style={({ pressed }) => [styles.source, pressed && styles.pressed]}>
          <View style={styles.flex}>
            <ThemedText numberOfLines={2}>{source.title || source.host}</ThemedText>
            <ThemedText variant="mono" color="inkMuted">
              {[SOURCE_TYPE_LABELS[source.type], source.community, source.host]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
          </View>
          <ArrowSquareOutIcon size={IconSize.small} color={theme.accent} />
        </Pressable>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: Spacing.two },
  finding: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  source: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pressed: { opacity: 0.6 },
});
