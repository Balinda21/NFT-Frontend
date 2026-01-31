import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

type SparklineProps = {
  data?: number[];
  width?: number;
  height?: number;
  isPositive?: boolean; // kept for compatibility but not used for color
};

// Single cream/coral color for ALL sparklines (matching reference design)
const SPARKLINE_COLOR = '#E8A838';

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 80,
  height = 32,
  isPositive = true,
}) => {
  // Need at least 2 points to draw a line
  if (!data || data.length < 2) {
    // Generate synthetic wavy data when no real data available
    const syntheticData = generateSyntheticData(isPositive);
    return renderSparkline(syntheticData, width, height);
  }

  return renderSparkline(data, width, height);
};

// Generate synthetic sparkline data that looks natural
const generateSyntheticData = (isPositive: boolean): number[] => {
  const points = 30;
  const data: number[] = [];
  let value = 50;

  for (let i = 0; i < points; i++) {
    // Add some randomness with a slight trend
    const trend = isPositive ? 0.3 : -0.3;
    const noise = (Math.sin(i * 0.5) * 10) + (Math.random() - 0.5) * 8;
    value = Math.max(10, Math.min(90, value + noise * 0.3 + trend));
    data.push(value);
  }

  return data;
};

const renderSparkline = (
  data: number[],
  width: number,
  height: number
) => {
  // Normalize data to fit within the SVG viewBox
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Add padding to prevent line from touching edges
  const paddingY = height * 0.15;
  const paddingX = 2;
  const chartHeight = height - paddingY * 2;
  const chartWidth = width - paddingX * 2;

  // Create points
  const points = data.map((value, index) => {
    const x = paddingX + (index / (data.length - 1)) * chartWidth;
    const normalizedY = (value - min) / range;
    const y = paddingY + chartHeight - normalizedY * chartHeight;
    return { x, y };
  });

  // Build smooth path
  let pathD = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    pathD += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }

  // Create fill path (area under the line)
  const fillPathD = pathD + ` L ${width - paddingX} ${height} L ${paddingX} ${height} Z`;

  const gradientId = `grad-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={SPARKLINE_COLOR} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={SPARKLINE_COLOR} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Gradient fill */}
        <Path d={fillPathD} fill={`url(#${gradientId})`} />

        {/* Line */}
        <Path
          d={pathD}
          stroke={SPARKLINE_COLOR}
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
