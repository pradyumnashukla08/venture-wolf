import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';

const MOCK_MENTORS = [
  { id: '1', name: 'Ankit Sharma', role: 'Ex-Flipkart', tags: ['GTM', 'Scale'] },
  { id: '2', name: 'Neha Singh', role: 'Ex-Zomato', tags: ['Product', 'Operations'] },
  { id: '3', name: 'Varun Mayya', role: 'Growth Expert', tags: ['Fundraising Strategy', 'AI'] },
  { id: '4', name: 'Kunal Bahl', role: 'Serial Founder', tags: ['Product-Market Fit', 'Angel Investing'] },
  { id: '5', name: 'Shruti Patel', role: 'Ex-Razorpay', tags: ['Fintech', 'B2B Sales'] },
  { id: '6', name: 'Rohan Desai', role: 'Founding Engineer', tags: ['Tech Stack', 'Hiring'] },
];

export const MentorsDirectoryScreen = ({ navigation }: any) => {
  return (
    <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerBlock}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Mentor Directory</Text>
        <Text style={styles.pageSubtitle}>Connect with 40+ verified industry experts</Text>
      </View>

      <View style={styles.grid}>
        {MOCK_MENTORS.map(mentor => (
          <TouchableOpacity 
            key={mentor.id} 
            activeOpacity={0.8}
            style={[styles.mentorCard, theme.shadows.premiumLight]}
            onPress={() => navigation.navigate('MentorBooking', { mentorData: mentor })}
          >
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#CBD5E1" />
              </View>
              <View style={styles.nameBlock}>
                <Text style={styles.name}>{mentor.name}</Text>
                <Text style={styles.role}>{mentor.role}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </View>
            <View style={styles.tagsBlock}>
              {mentor.tags.map((tag, i) => (
                <View key={i} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ResponsiveScrollContainer>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#F8FAFC' },
  content: { padding: 24, paddingBottom: 60 },
  headerBlock: { marginBottom: 32 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  grid: { gap: 16 },
  mentorCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  nameBlock: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 2 },
  role: { fontSize: 13, color: '#64748B' },
  tagsBlock: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBadge: { backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#BAE6FD' },
  tagText: { color: '#0369A1', fontSize: 11, fontWeight: 'bold' }
});
