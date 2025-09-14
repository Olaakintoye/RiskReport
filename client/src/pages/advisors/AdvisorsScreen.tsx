import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AdvisorCard, { AdvisorCardProps } from '../../components/ui/AdvisorCard';

// Sample advisor data
const sampleAdvisors: AdvisorCardProps[] = [
  {
    name: 'Sarah Chen',
    role: 'Senior Portfolio Manager',
    rating: 4.9,
    earned: '$2.4M',
    rate: '$500/hr',
    status: 'online',
    verified: true,
    avatarUri: undefined,
  },
  {
    name: 'Michael Rodriguez',
    role: 'Risk Management Specialist',
    rating: 4.8,
    earned: '$1.8M',
    rate: '$450/hr',
    status: 'online',
    verified: true,
    avatarUri: undefined,
  },
  {
    name: 'Emily Thompson',
    role: 'Financial Advisor',
    rating: 4.7,
    earned: '$1.2M',
    rate: '$350/hr',
    status: 'offline',
    verified: true,
    avatarUri: undefined,
  },
  {
    name: 'David Kim',
    role: 'Quantitative Analyst',
    rating: 4.9,
    earned: '$2.1M',
    rate: '$550/hr',
    status: 'online',
    verified: true,
    avatarUri: undefined,
  },
];

export default function AdvisorsScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'online' | 'offline'>('all');

  const filteredAdvisors = sampleAdvisors.filter((advisor) => {
    const matchesSearch = advisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      advisor.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || advisor.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const handleContactAdvisor = (advisor: AdvisorCardProps) => {
    Alert.alert(
      'Contact Advisor',
      `Would you like to schedule a consultation with ${advisor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Schedule',
          onPress: () => {
            Alert.alert('Success', `Consultation request sent to ${advisor.name}`);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Financial Advisors</Text>
        </View>
        <Text style={styles.subtitle}>Connect with expert financial advisors</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search advisors or specialties..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {['all', 'online', 'offline'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              selectedFilter === filter && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter(filter as typeof selectedFilter)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedFilter === filter && styles.filterButtonTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Advisors List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.advisorsList}>
          {filteredAdvisors.map((advisor, index) => (
            <View key={index} style={styles.advisorCardContainer}>
              <AdvisorCard
                {...advisor}
                onPressContact={() => handleContactAdvisor(advisor)}
              />
            </View>
          ))}
          
          {filteredAdvisors.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={64} color="#8E8E93" />
              <Text style={styles.emptyStateTitle}>No advisors found</Text>
              <Text style={styles.emptyStateSubtitle}>
                Try adjusting your search or filter criteria
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backButton: {
    marginRight: 12,
    marginLeft: -4,
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    flex: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  advisorsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  advisorCardContainer: {
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
