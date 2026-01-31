import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

type SparklineProps = {
  data?: number[];
  width?: number;
  height?: number;
};

// Coral/orange color matching the reference design
const SPARKLINE_COLOR = '#E8A838';

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 80,
  height = 32,
}) => {
  // Need at least 2 points to draw a line
  if (!data || data.length < 2) {
    return <View style={[styles.container, { width, height }]} />;
  }

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
            <Stop offset="0%" stopColor={SPARKLINE_COLOR} stopOpacity={0.25} />
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
