import type { ProductReport } from '@sniff/core';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { QuestionIcon, XCircleIcon, type Icon } from '@/components/icons';
import {
  AdClaimsSection,
  IngredientsSection,
  ReviewsSection,
  SourcesSection,
  SubscoresSection,
} from '@/components/report/report-sections';
import { ReportSkeleton } from '@/components/report/report-skeleton';
import { VerdictCard } from '@/components/report/verdict-card';
import { ThemedText } from '@/components/themed-text';
import { PrimaryButton } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAnalysisJob } from '@/hooks/use-analysis-job';
import { useTheme } from '@/hooks/use-theme';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAnalysisJob(id);

  if (state.kind === 'error') {
    return <Message icon={QuestionIcon} title="결과를 불러오지 못했어요" body={state.message} />;
  }
  if (state.kind === 'loading' || state.job.status === 'pending') {
    return <ReportSkeleton query={state.kind === 'job' ? state.job.query : ''} />;
  }
  if (state.job.status === 'failed') {
    return <Message icon={XCircleIcon} title="검사하지 못했어요" body={state.job.error} />;
  }
  return <Report report={state.job.report} reportId={state.job.id} />;
}

function Report({ report, reportId }: { report: ProductReport; reportId: string }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <VerdictCard report={report} reportId={reportId} />
      <SubscoresSection report={report} />
      <AdClaimsSection report={report} />
      <ReviewsSection report={report} />
      <IngredientsSection report={report} />
      <SourcesSection report={report} />
      <ThemedText variant="caption" color="inkMuted" style={styles.disclaimer}>
        공개된 웹 정보를 AI가 정리한 참고 자료예요. 의학적·법률적 판단을 대신하지 않으며, 실제와 다를 수 있어요.
      </ThemedText>
    </ScrollView>
  );
}

type MessageProps = {
  icon: Icon;
  title: string;
  body: string;
};

function Message({ icon: MessageIcon, title, body }: MessageProps) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <MessageIcon size={40} color={theme.inkMuted} />
      <View style={styles.message}>
        <ThemedText variant="title" style={styles.centerText}>
          {title}
        </ThemedText>
        <ThemedText color="inkMuted" style={styles.centerText}>
          {body}
        </ThemedText>
      </View>
      <PrimaryButton label="다시 검색하기" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: Spacing.seven,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  disclaimer: { textAlign: 'center', paddingHorizontal: Spacing.four },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
    padding: Spacing.six,
  },
  message: { gap: Spacing.two },
  centerText: { textAlign: 'center' },
});
