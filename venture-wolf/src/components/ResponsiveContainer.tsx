import React from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: object;
  maxWidth?: number;
}

export const ResponsiveContainer = ({ children, style, maxWidth = 800 }: ResponsiveContainerProps) => {
  const { width } = useWindowDimensions();
  
  return (
    <View style={[styles.wrapper, style]}>
      <View style={[styles.innerContainer, { maxWidth, width: '100%' }]}>
        {children}
      </View>
    </View>
  );
};

// Also expose a scrollable version since many screens use ScrollView at their root
export const ResponsiveScrollContainer = ({ children, style, contentContainerStyle, maxWidth = 800 }: any) => {
  const { width } = useWindowDimensions();
  
  return (
    <ScrollView 
      style={[styles.wrapper, style]} 
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.innerContainer, { maxWidth, width: '100%' }]}>
        {children}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center', // Centers the innerContainer
  },
  innerContainer: {
    alignSelf: 'center',
    flex: 1,
  }
});
