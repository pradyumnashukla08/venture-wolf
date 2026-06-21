import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Modal, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { ResponsiveScrollContainer } from '../components/ResponsiveContainer';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DATES = Array.from({length: 7}).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i + 1); // Start from tomorrow
  return { day: DAYS[d.getDay()], date: d.getDate().toString() };
});
const TIMES = ['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM', '06:00 PM'];

export const MentorBookingScreen = ({ route, navigation }: any) => {
  const mentor = route.params?.mentorData || { name: 'Expert Mentor', role: 'System Match' };
  
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleBooking = () => {
    if (selectedTime === null) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.goBack();
      }, 2500);
    }, 1500);
  };

  return (
    <View style={styles.wrapper}>
      <ResponsiveScrollContainer style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.mentorHeader}>
          <View style={[styles.avatarLarge, theme.shadows.premiumLight]}>
            <Ionicons name="person" size={32} color="#CBD5E1" />
          </View>
          <Text style={styles.mentorName}>{mentor.name}</Text>
          <Text style={styles.mentorRole}>{mentor.role}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>Top 1% Mentor</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Select a Day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {DATES.map((d, index) => {
            const isActive = selectedDate === index;
            return (
              <TouchableOpacity 
                key={index} 
                activeOpacity={0.8} 
                onPress={() => { setSelectedDate(index); setSelectedTime(null); }}
                style={[styles.dateCapsule, isActive && styles.dateCapsuleActive]}
              >
                <Text style={[styles.dayText, isActive && styles.textActive]}>{d.day}</Text>
                <Text style={[styles.dateText, isActive && styles.textActive]}>{d.date}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Select a Time</Text>
        <View style={styles.timeGrid}>
          {TIMES.map((t, index) => {
            const isActive = selectedTime === t;
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.8}
                onPress={() => setSelectedTime(t)}
                style={[styles.timeSlot, isActive && styles.timeSlotActive]}
              >
                <Text style={[styles.timeText, isActive && styles.textActive]}>{t}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ResponsiveScrollContainer>

      {/* Fixed Bottom Action */}
      <View style={[styles.bottomBar, theme.shadows.premiumLight]}>
        <TouchableOpacity 
          style={[styles.confirmBtn, !selectedTime && styles.confirmBtnDisabled]} 
          activeOpacity={0.8}
          disabled={!selectedTime || isProcessing}
          onPress={handleBooking}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm Session Booking</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={[styles.successCard, theme.shadows.premiumLight]}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={40} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Booking Confirmed!</Text>
            <Text style={styles.successSub}>A Google Meet invite has been dispatched to your data room email.</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 120 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 24, marginTop: Platform.OS === 'ios' ? 44 : 20 },
  mentorHeader: { alignItems: 'center', marginBottom: 32 },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  mentorName: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  mentorRole: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  tierBadge: { backgroundColor: '#FEFCE8', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FEF08A' },
  tierText: { color: '#CA8A04', fontSize: 11, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
  dateScroll: { gap: 12, paddingBottom: 32 },
  dateCapsule: { width: 64, height: 80, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  dateCapsuleActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  dayText: { fontSize: 11, color: '#64748B', fontWeight: 'bold', marginBottom: 4 },
  dateText: { fontSize: 20, color: '#0F172A', fontWeight: '900' },
  textActive: { color: '#FFFFFF' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 24 },
  timeSlot: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  timeSlotActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  timeText: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  confirmBtn: { backgroundColor: theme.colors.primary, paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: '#CBD5E1' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  successOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', maxWidth: 400 },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  successSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 }
});
