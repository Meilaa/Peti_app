import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTrial } from '../contexts/TrialContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import environments from '../constants/enviroments';
import colors from '../constants/colors';

const SubscriptionPage = () => {
  const { trialActive, daysRemaining, canStartTrial, startTrial } = useTrial();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        // Get subscription data from the API
        const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('userToken');
        
        if (!token) {
          throw new Error('Authentication required');
        }
        
        const response = await fetch(`${environments.API_BASE_URL}/api/subscription`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        } else if (response.status !== 404) {
          // 404 is normal for users without subscriptions
          console.error('Failed to fetch subscription:', response.status);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const handleSubscribe = async (plan) => {
    try {
      setProcessingAction(true);
      // Navigate to payment page with the selected plan
      router.push({
        pathname: '/screens/AccountInfo/Payment',
        params: { selectedPlan: plan }
      });
    } catch (error) {
      console.error('Error subscribing:', error);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleStartTrial = async () => {
    setProcessingAction(true);
    const success = await startTrial();
    setProcessingAction(false);
    
    if (success) {
      // Maybe show a success message
    }
  };

  const handleManageSubscription = async () => {
    try {
      setProcessingAction(true);
      const token = await AsyncStorage.getItem('authToken') || await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Create billing portal session
      const response = await fetch(`${environments.API_BASE_URL}/api/create-billing-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to create billing portal session');
      }
      
      const { url } = await response.json();
      
      // Open the URL in browser
      // This would need to use Linking API or WebView in a real app
      console.log('Open URL in browser:', url);
      // Linking.openURL(url);
    } catch (error) {
      console.error('Error opening billing portal:', error);
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.yellow} />
        <Text style={styles.loadingText}>Loading subscription info...</Text>
      </View>
    );
  }

  const hasActiveSubscription = subscription && subscription.status === 'active';
  const formattedEndDate = subscription?.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString() 
    : '';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Subscription</Text>
      
      {trialActive && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Free Trial Active</Text>
          <Text style={styles.cardText}>
            You have {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining in your free trial.
          </Text>
          <Text style={styles.cardText}>
            Subscribe now to continue access after your trial ends.
          </Text>
        </View>
      )}

      {!trialActive && canStartTrial && !hasActiveSubscription && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Try Premium Features</Text>
          <Text style={styles.cardText}>
            Start your 14-day free trial to access all premium features.
          </Text>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleStartTrial}
            disabled={processingAction}
          >
            {processingAction ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonText}>Start Free Trial</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {hasActiveSubscription && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Active Subscription</Text>
          <Text style={styles.cardText}>
            Your subscription is active until {formattedEndDate}
          </Text>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleManageSubscription}
            disabled={processingAction}
          >
            {processingAction ? (
              <ActivityIndicator size="small" color={colors.yellow} />
            ) : (
              <Text style={styles.secondaryButtonText}>Manage Subscription</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!hasActiveSubscription && (
        <View style={styles.plansContainer}>
          <Text style={styles.sectionTitle}>Choose a Plan</Text>
          
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>Monthly Plan</Text>
            <Text style={styles.planPrice}>€9.99/month</Text>
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => handleSubscribe('monthly')}
              disabled={processingAction}
            >
              {processingAction ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.buttonText}>Subscribe</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.grey,
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.black,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 12,
    color: colors.grey,
  },
  primaryButton: {
    backgroundColor: colors.yellow,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.black,
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.yellow,
  },
  secondaryButtonText: {
    color: colors.yellow,
    fontWeight: '600',
    fontSize: 16,
  },
  plansContainer: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: colors.black,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.black,
    marginVertical: 8,
  },
});

export default SubscriptionPage; 