import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ArrowRightIcon,
  ChatCircleTextIcon,
  DetectiveIcon,
  FlaskIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  TagIcon,
  WarningIcon,
  type Icon,
} from '@/components/icons';
import { ThemedText } from '@/components/themed-text';
import { Divider, Panel, PrimaryButton } from '@/components/ui';
import {
  FontFamily,
  HairlineWidth,
  IconSize,
  MaxContentWidth,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, createAnalysis } from '@/lib/api';

const MIN_QUERY_LENGTH = 2;
const EXAMPLES = ['라운드랩 독도 토너', '종근당 락토핏 골드', '다이슨 에어랩'];

const CHECKS: readonly { icon: Icon; title: string; body: string }[] = [
  { icon: ChatCircleTextIcon, title: '리뷰 신뢰도', body: '협찬·체험단 리뷰를 걸러내고 실사용 평판만 봐요.' },
  { icon: MegaphoneIcon, title: '광고 주장', body: '효능 문구를 근거와 대조해 과장·허위를 가려요.' },
  { icon: FlaskIcon, title: '성분', body: '주요 성분의 역할과 주의할 성분을 짚어요.' },
  { icon: TagIcon, title: '가격 대비 가치', body: '비슷한 제품과 비교해 값어치를 따져요.' },
];

export default function HomeScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = query.trim().length >= MIN_QUERY_LENGTH && !isSubmitting;
  const inputBorder = errorMessage ? theme.fail : isFocused ? theme.accent : theme.line;

  const handleChange = (value: string) => {
    setQuery(value);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const job = await createAnalysis(query);
      router.push({ pathname: '/report/[id]', params: { id: job.id } });
    } catch (error: unknown) {
      setErrorMessage(error instanceof ApiError ? error.message : '검사를 시작하지 못했어요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <DetectiveIcon size={IconSize.large} color={theme.ink} weight="duotone" />
            <ThemedText style={styles.wordmark}>sniff</ThemedText>
          </View>

          <View style={styles.hero}>
            <ThemedText variant="display">사기 전에,{'\n'}검사부터 해보세요</ThemedText>
            <ThemedText color="inkMuted">
              리뷰·광고·성분의 근거를 찾아 살 만한 제품인지 판정해요.
            </ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText variant="label" nativeID="query-label">
              제품명 또는 상품 링크
            </ThemedText>
            <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: inputBorder }]}>
              <MagnifyingGlassIcon size={IconSize.medium} color={theme.inkMuted} />
              <TextInput
                value={query}
                onChangeText={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="예: 라운드랩 독도 토너"
                placeholderTextColor={theme.inkMuted}
                style={[styles.input, { color: theme.ink }]}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={() => void handleSubmit()}
                editable={!isSubmitting}
                accessibilityLabelledBy="query-label"
              />
            </View>
            {errorMessage ? (
              <View style={styles.helper} accessibilityLiveRegion="polite">
                <WarningIcon size={IconSize.small} color={theme.fail} weight="bold" />
                <ThemedText variant="caption" color="fail" style={styles.flex}>
                  {errorMessage}
                </ThemedText>
              </View>
            ) : (
              <ThemedText variant="caption" color="inkMuted">
                쇼핑몰 상품 페이지 링크를 붙여 넣어도 돼요.
              </ThemedText>
            )}
          </View>

          <PrimaryButton
            label={isSubmitting ? '검사 요청 중' : '검사하기'}
            trailingIcon={isSubmitting ? undefined : ArrowRightIcon}
            onPress={() => void handleSubmit()}
            disabled={!canSubmit}
          />

          <View style={styles.examples}>
            <ThemedText variant="label" color="inkMuted">
              예시
            </ThemedText>
            <View style={styles.chips}>
              {EXAMPLES.map((example) => (
                <Pressable
                  key={example}
                  onPress={() => handleChange(example)}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityHint="입력칸에 채워 넣어요"
                  style={({ pressed }) => [
                    styles.chip,
                    { borderColor: theme.line, backgroundColor: theme.surface },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText variant="caption">{example}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.checks}>
            <ThemedText variant="heading">sniff가 확인하는 것</ThemedText>
            <Panel>
              {CHECKS.map(({ icon: CheckIcon, title, body }, index) => (
                <Fragment key={title}>
                  {index > 0 ? <Divider /> : null}
                  <View style={styles.checkRow}>
                    <View style={[styles.checkIcon, { backgroundColor: theme.accentSoft }]}>
                      <CheckIcon size={IconSize.medium} color={theme.accent} />
                    </View>
                    <View style={styles.flex}>
                      <ThemedText variant="bodyStrong">{title}</ThemedText>
                      <ThemedText variant="caption" color="inkMuted">
                        {body}
                      </ThemedText>
                    </View>
                  </View>
                </Fragment>
              ))}
            </Panel>
            <ThemedText variant="caption" color="inkMuted">
              모든 판정에는 근거로 삼은 출처가 함께 표시돼요.
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: Spacing.five,
    padding: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.seven,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  wordmark: { fontFamily: FontFamily.monoBold, fontSize: 20, lineHeight: 24, letterSpacing: -0.5 },
  hero: { gap: Spacing.two },
  field: { gap: Spacing.two },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, minHeight: 52, fontFamily: FontFamily.regular, fontSize: 16 },
  helper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  examples: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    borderWidth: HairlineWidth,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: { opacity: 0.6 },
  checks: { gap: Spacing.three },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  checkIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
