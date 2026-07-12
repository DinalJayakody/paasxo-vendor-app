import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

interface Props {
  colors: string[];
  style?: ViewStyle;
}

/** Full-bleed diagonal gradient rendered with react-native-svg (no extra native deps). */
export default function GradientBackground({ colors, style }: Props) {
  return (
    <Svg style={[StyleSheet.absoluteFillObject, style]} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          {colors.map((c, i) => (
            <Stop key={c + i} offset={`${(i / Math.max(colors.length - 1, 1)) * 100}%`} stopColor={c} />
          ))}
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#bg)" />
    </Svg>
  );
}
