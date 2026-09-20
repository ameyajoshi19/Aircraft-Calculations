import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalculatorColors, CalculatorSpacing } from '@/constants/calculator-theme';

export function GradientScreen({
  icon,
  title,
  footer,
  children,
}: {
  icon: string;
  title: string;
  footer?: string;
  children: ReactNode;
}) {
  return (
    <LinearGradient colors={CalculatorColors.gradient} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>

          {children}

          {footer ? <Text style={styles.footer}>{footer}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  content: {
    padding: CalculatorSpacing.lg,
    paddingBottom: CalculatorSpacing.xl * 2,
    gap: CalculatorSpacing.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CalculatorSpacing.sm,
  },
  icon: { fontSize: 28 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: CalculatorColors.textPrimary,
  },
  footer: {
    textAlign: 'center',
    color: CalculatorColors.textFaint,
    fontSize: 12,
    marginTop: CalculatorSpacing.sm,
  },
});
