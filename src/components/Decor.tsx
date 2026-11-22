import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from './ui';

export const HANDWRITING_FONT = 'NanumPenScript_400Regular';

/** 화면 전체 배경: 연한 분홍 그라데이션 + 흐릿한 하트 */
export function ScreenBackground({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#FFF3EF', '#FFF7F4', '#FDEDE8']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Heart size={26} color="#FF9A8B" style={{ top: 96, right: 18, opacity: 0.35 }} />
      <Heart size={18} color="#FFB3A7" style={{ top: 640, right: 10, opacity: 0.3 }} />
      <Heart size={14} color="#FFB3A7" style={{ top: 420, left: 6, opacity: 0.22 }} />
      {children}
    </View>
  );
}

function Heart({ size, color, style }: { size: number; color: string; style: object }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute' }, style]}>
      <Ionicons name="heart" size={size} color={color} />
    </View>
  );
}

/** 스크롤 맨 끝의 물결 + 손글씨 문구 */
export function FooterWave({ height = 150, fontsLoaded }: { height?: number; fontsLoaded: boolean }) {
  return (
    <View pointerEvents="none" style={[styles.footer, { height }]}>
      <Svg width="100%" height={height} viewBox="0 0 400 130" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Path d="M0 40 C 80 10, 150 70, 230 45 S 360 15, 400 35 L 400 130 L 0 130 Z" fill="#FBDCD5" opacity={0.55} />
        <Path d="M0 70 C 90 45, 170 95, 260 70 S 370 50, 400 65 L 400 130 L 0 130 Z" fill="#FAD0C7" opacity={0.55} />
      </Svg>
      <View style={styles.footerTextWrap}>
        <Ionicons name="heart-outline" size={20} color="#F28C7D" style={{ marginBottom: 2 }} />
        <Text style={[styles.footerText, fontsLoaded && { fontFamily: HANDWRITING_FONT }]}>
          소중한 날을{'\n'}잊지 않도록, 늘 함께해요 <Text style={{ color: '#F27B6B' }}>♥</Text>
        </Text>
      </View>
    </View>
  );
}

/** 왼쪽에 빨간 막대가 있는 섹션 제목 */
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        <View style={styles.sectionBar} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/** 색 원 안의 이니셜 (가족 목록) */
export function InitialBadge({ text, color, size = 52 }: { text: string; color: string; size?: number }) {
  return (
    <LinearGradient
      colors={[lighten(color, 0.25), color]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.44, fontWeight: '800' }}>{text}</Text>
    </LinearGradient>
  );
}

/** #RRGGBB 를 흰색 쪽으로 amount(0~1) 만큼 밝게 */
export function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const styles = StyleSheet.create({
  footer: { marginHorizontal: -20, marginTop: 28 },
  footerTextWrap: { position: 'absolute', left: 24, top: 52 },
  footerText: { fontSize: 22, lineHeight: 26, color: '#5E4038' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 14,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionBar: { width: 5, height: 22, borderRadius: 3, backgroundColor: colors.primary, marginRight: 10 },
  sectionTitle: { fontSize: 21, fontWeight: '800', color: colors.text },
});
