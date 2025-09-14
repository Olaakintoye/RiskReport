import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export interface AdvisorCardProps {
  name: string;
  role: string;
  rating: string | number;
  earned: string;
  rate: string;
  status?: 'online' | 'offline';
  avatarUri?: string;
  verified?: boolean;
  onPressContact?: () => void;
}

export default function AdvisorCard({
  name,
  role,
  rating,
  earned,
  rate,
  status = 'online',
  avatarUri,
  verified = true,
  onPressContact,
}: AdvisorCardProps) {
  const isOnline = status === 'online';

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={["#1B1F68", "#000000", "#7A0C2D"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.card}
      >
        {/* Avatar + Info */}
        <View style={styles.headerRow}>
          <View>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Ionicons name="person" size={28} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={styles.infoBlock}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>{name}</Text>
              {verified && (
                <Ionicons name="checkmark-circle" size={16} color="#818CF8" />
              )}
            </View>
            <Text style={styles.roleText}>{role}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#22C55E' : '#9CA3AF' }]} />
              <Text style={[styles.statusText, { color: isOnline ? '#22C55E' : '#9CA3AF' }]}>{status}</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{String(rating)}</Text>
            <Text style={styles.statLabel}>rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earned}</Text>
            <Text style={styles.statLabel}>earned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rate}</Text>
            <Text style={styles.statLabel}>rate</Text>
          </View>
        </View>

        {/* CTA Button */}
        <TouchableOpacity style={styles.ctaButton} onPress={onPressContact} activeOpacity={0.8}>
          <Text style={styles.ctaText}>Get in Touch</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    backgroundColor: '#000000',
    padding: 6,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#000000',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBlock: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  roleText: {
    color: '#D1D5DB',
    fontSize: 13,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#222222',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#000000',
    fontWeight: '700',
  },
});


