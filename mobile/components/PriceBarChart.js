import React from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { useLanguage } from '../context/LanguageContext';

const mandiColors = ['#2E7D32', '#1565C0', '#EF6C00', '#8E24AA', '#00838F', '#C62828'];

export default function PriceBarChart({ prices, recommendedMandiId, title }) {
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useLanguage();
  if (!prices || prices.length === 0) return null;

  const chartPrices = prices.slice(0, 6).map((item) => Number(item.modalPrice) || 0);
  const chartLabels = prices.slice(0, 6).map((item) => item.mandi?.name || 'Market');
  const chartWidth = Math.max(screenWidth - spacing.large * 2, chartPrices.length * 110 + 70);
  const chartHeight = 310;
  const leftAxis = 58;
  const rightAxis = 12;
  const topAxis = 16;
  const bottomAxis = 92;
  const plotWidth = chartWidth - leftAxis - rightAxis;
  const plotHeight = chartHeight - topAxis - bottomAxis;
  const maxPrice = Math.max(...chartPrices, 1);
  const minPrice = Math.min(...chartPrices, 0);
  const priceRange = Math.max(maxPrice - minPrice, 1);
  const xStep = chartPrices.length > 1 ? plotWidth / (chartPrices.length - 1) : plotWidth / 2;
  const points = chartPrices.map((price, index) => {
    const x = chartPrices.length > 1 ? leftAxis + index * xStep : leftAxis + xStep;
    const y = topAxis + ((maxPrice - price) / priceRange) * plotHeight;
    return { x, y, price };
  });
  const gridValues = [0, 0.5, 1].map((ratio) => maxPrice - ratio * priceRange);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title || t('priceGraph')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.chartScroll}>
        <View style={styles.chartWrap}>
          <Svg width={chartWidth} height={chartHeight}>
          {gridValues.map((value, index) => {
            const y = topAxis + (index / 2) * plotHeight;
            return (
              <React.Fragment key={`grid-${index}`}>
                <Line x1={leftAxis} y1={y} x2={chartWidth - rightAxis} y2={y} stroke={colors.border} strokeDasharray="4,4" />
                <SvgText x={leftAxis - 8} y={y + 4} textAnchor="end" fontSize="10" fill={colors.textSecondary}>
                  {`₹${Math.round(value)}`}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Line x1={leftAxis} y1={topAxis} x2={leftAxis} y2={topAxis + plotHeight} stroke={colors.textSecondary} strokeWidth="1.5" />
          <Line x1={leftAxis} y1={topAxis + plotHeight} x2={chartWidth - rightAxis} y2={topAxis + plotHeight} stroke={colors.textSecondary} strokeWidth="1.5" />
          {points.slice(1).map((point, index) => (
            <Line
              key={`segment-${index}`}
              x1={points[index].x}
              y1={points[index].y}
              x2={point.x}
              y2={point.y}
              stroke={mandiColors[index % mandiColors.length]}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
          {points.map(({ x, y, price }, index) => (
            <React.Fragment key={`point-${index}`}>
              {String(prices[index].mandi?.id) === String(recommendedMandiId) && (
                <Circle cx={x} cy={y} r="10" fill="none" stroke={colors.accent} strokeWidth="3" />
              )}
              <Circle cx={x} cy={y} r="6" fill={mandiColors[index % mandiColors.length]} stroke={colors.surface} strokeWidth="2" />
              <SvgText x={x} y={y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill={colors.text}>
                {`₹${price}`}
              </SvgText>
              <SvgText x={x} y={topAxis + plotHeight + 18} textAnchor="middle" fontSize="9" fill={mandiColors[index % mandiColors.length]}>
                {chartLabels[index].slice(0, 12)}
              </SvgText>
            </React.Fragment>
          ))}
          <SvgText x={leftAxis - 32} y={topAxis + plotHeight / 2} rotation="-90" textAnchor="middle" fontSize="10" fill={colors.textSecondary}>
            {t('priceAxis')}
          </SvgText>
          <SvgText x={leftAxis + plotWidth / 2} y={chartHeight - 3} textAnchor="middle" fontSize="10" fill={colors.textSecondary}>
            {t('mandiAxis')}
          </SvgText>
          </Svg>
        </View>
      </ScrollView>
      <View style={styles.legend}>
        {prices.slice(0, 6).map((item, index) => (
          <View key={`legend-${item.id ?? index}`} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: mandiColors[index % mandiColors.length] }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {item.mandi?.name || 'Market'}{String(item.mandi?.id) === String(recommendedMandiId) ? ` (${t('bestMandi')})` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.medium,
    marginBottom: spacing.large,
  },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.small },
  chartScroll: { minWidth: '100%' },
  chartWrap: { alignItems: 'center', overflow: 'visible' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.small, marginTop: spacing.small },
  legendItem: { flexDirection: 'row', alignItems: 'center', maxWidth: '48%' },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginRight: 4 },
  legendText: { flexShrink: 1, color: colors.textSecondary, fontSize: 11 },
});
