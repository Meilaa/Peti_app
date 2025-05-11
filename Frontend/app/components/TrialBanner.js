import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTrial } from '../contexts/TrialContext';
import colors from '../constants/colors';

const TrialBanner = () => {
  const { trialActive, daysRemaining, canStartTrial, startTrial, isLoading } = useTrial();
  const router = useRouter();
  const [processing, setProcessing] = React.useState(false);

  // Don't show anything while loading
  if (isLoading) return null;

  const handleStartTrial = async () => {
    setProcessing(true);
    const success = await startTrial();
    setProcessing(false);
    
    if (success) {
      // Maybe show a success toast or message
    }
  };

  const navigateToSubscription = () => {
    router.push('/screens/AccountInfo/Payment');
  };

  if (trialActive) {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Your free trial is active! {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
        </Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={navigateToSubscription}
        >
          <Text style={styles.actionButtonText}>Upgrade now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (canStartTrial) {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Try our premium features free for 14 days
        </Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleStartTrial}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color={colors.black} />
          ) : (
            <Text style={styles.actionButtonText}>Start Free Trial</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.yellow,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  bannerText: {
    flex: 1,
    color: colors.black,
    fontWeight: '500',
    fontSize: 14,
    marginRight: 8,
  },
  actionButton: {
    backgroundColor: colors.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  actionButtonText: {
    color: colors.black,
    fontWeight: '600',
    fontSize: 12,
  }
});

export default TrialBanner; 