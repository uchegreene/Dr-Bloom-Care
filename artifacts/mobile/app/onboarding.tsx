import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Switch, Keyboard, Alert } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { parseISO, isValid, isFuture, differenceInYears } from 'date-fns';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useProfile, PLAN_PRICES, Subscription, SubscriptionPlan } from '@/hooks/useProfileContext';

const formatNaira = (n: number) => '\u20A6' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const detectBrand = (digits: string): string => {
  if (digits.startsWith('5060') || digits.startsWith('5061') || digits.startsWith('650')) return 'Verve';
  if (digits.startsWith('4')) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Card';
};

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const router = useRouter();
  const { completeOnboarding } = useProfile();

  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [mode, setMode] = useState<'cycle' | 'pregnant' | null>(null);

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const plan: SubscriptionPlan = mode === 'pregnant' ? 'pregnancy' : 'cycle';
  const price = PLAN_PRICES[plan];
  const planName = mode === 'pregnant' ? 'Pregnancy Tracking' : 'Cycle Tracking';

  const validateDetails = (): string | null => {
    if (!name.trim()) return 'Please enter your full name.';
    const parsed = parseISO(dob);
    if (!dob.trim() || !isValid(parsed)) return 'Please enter your date of birth as YYYY-MM-DD.';
    if (isFuture(parsed)) return 'Date of birth cannot be in the future.';
    const age = differenceInYears(new Date(), parsed);
    if (age < 13) return 'You must be at least 13 years old to use HER BLOOM.';
    if (age > 120) return 'Please enter a valid date of birth.';
    if (!mode) return 'Please choose what you would like to track.';
    return null;
  };

  const handleContinue = () => {
    Keyboard.dismiss();
    const err = validateDetails();
    if (err) {
      setError(err);
      Alert.alert('Almost there', err);
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleCardNumber = (t: string) => {
    const digits = t.replace(/\D/g, '').slice(0, 19);
    const grouped = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(grouped);
    if (error) setError(null);
  };

  const handleExpiry = (t: string) => {
    const digits = t.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    setExpiry(formatted);
    if (error) setError(null);
  };

  const validateCard = (): string | null => {
    const digits = cardNumber.replace(/\D/g, '');
    if (!cardName.trim()) return 'Please enter the name on your card.';
    if (digits.length < 13) return 'Please enter a valid card number.';
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Please enter the expiry as MM/YY.';
    const month = parseInt(expiry.slice(0, 2), 10);
    if (month < 1 || month > 12) return 'Please enter a valid expiry month.';
    if (!/^\d{3,4}$/.test(cvv)) return 'Please enter a valid CVV.';
    return null;
  };

  const handleSubscribe = async () => {
    Keyboard.dismiss();
    if (!mode) {
      setStep(1);
      return;
    }
    const err = validateCard();
    if (err) {
      setError(err);
      Alert.alert('Check your card details', err);
      return;
    }
    setError(null);
    const digits = cardNumber.replace(/\D/g, '');
    const subscription: Subscription = {
      plan,
      priceNaira: price,
      cardBrand: detectBrand(digits),
      cardLast4: digits.slice(-4),
      autoRenew,
      startedAt: new Date().toISOString(),
      status: 'active',
    };
    try {
      await completeOnboarding({ name: name.trim(), dateOfBirth: dob.trim(), mode, bio: '', subscription });
      router.replace(mode === 'pregnant' ? '/(tabs)/pregnancy' : '/(tabs)/cycle');
    } catch {
      const msg = 'We could not set up your account. Please try again.';
      setError(msg);
      Alert.alert('Something went wrong', msg);
    }
  };

  const detailsValid = !!name.trim() && !!dob.trim() && !!mode;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: (Platform.OS === 'web' ? 48 : insets.top) + 24, paddingBottom: (Platform.OS === 'web' ? 48 : insets.bottom) + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {step === 1 ? (
        <>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome to HER BLOOM</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A safe, warm place for your body and your journey. Let's set up your account.</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>Full name</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Your full name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={(t) => { setName(t); if (error) setError(null); }}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>Date of birth</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              value={dob}
              onChangeText={(t) => { setDob(t); if (error) setError(null); }}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>What are you tracking?</Text>
          <View style={styles.modeContainer}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: mode === 'cycle' ? colors.primary : colors.border, backgroundColor: mode === 'cycle' ? colors.secondary : colors.card }
              ]}
              onPress={() => { setMode('cycle'); if (error) setError(null); }}
            >
              <Text style={[styles.modeText, { color: mode === 'cycle' ? colors.primary : colors.foreground }]}>My Cycle</Text>
              <Text style={[styles.modePrice, { color: colors.mutedForeground }]}>{formatNaira(PLAN_PRICES.cycle)}/mo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                { borderColor: mode === 'pregnant' ? colors.primary : colors.border, backgroundColor: mode === 'pregnant' ? colors.secondary : colors.card }
              ]}
              onPress={() => { setMode('pregnant'); if (error) setError(null); }}
            >
              <Text style={[styles.modeText, { color: mode === 'pregnant' ? colors.primary : colors.foreground }]}>My Pregnancy</Text>
              <Text style={[styles.modePrice, { color: colors.mutedForeground }]}>{formatNaira(PLAN_PRICES.pregnancy)}/mo</Text>
            </TouchableOpacity>
          </View>

          {error && <Text style={[styles.error, { color: colors.primary }]}>{error}</Text>}
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.backRow} onPress={() => { setStep(1); setError(null); }} hitSlop={8}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
            <Text style={[styles.backText, { color: colors.foreground }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.foreground }]}>Choose your plan</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Unlock {planName.toLowerCase()} with a monthly membership.</Text>

          <View style={[styles.planCard, { backgroundColor: colors.secondary, borderColor: colors.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planName, { color: colors.foreground }]}>{planName}</Text>
              <Text style={[styles.planDesc, { color: colors.mutedForeground }]}>Billed monthly. Cancel anytime.</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.planPrice, { color: colors.primary }]}>{formatNaira(price)}</Text>
              <Text style={[styles.planPer, { color: colors.mutedForeground }]}>per month</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Payment details</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>Name on card</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="Full name"
              placeholderTextColor={colors.mutedForeground}
              value={cardName}
              onChangeText={(t) => { setCardName(t); if (error) setError(null); }}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>Card number</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholder="1234 5678 9012 3456"
              placeholderTextColor={colors.mutedForeground}
              value={cardNumber}
              onChangeText={handleCardNumber}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.foreground }]}>Expiry</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="MM/YY"
                placeholderTextColor={colors.mutedForeground}
                value={expiry}
                onChangeText={handleExpiry}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.foreground }]}>CVV</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                placeholder="123"
                placeholderTextColor={colors.mutedForeground}
                value={cvv}
                onChangeText={(t) => { setCvv(t.replace(/\D/g, '').slice(0, 4)); if (error) setError(null); }}
                keyboardType="number-pad"
                secureTextEntry
              />
            </View>
          </View>

          <View style={[styles.renewRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.renewTitle, { color: colors.foreground }]}>Auto-renew monthly</Text>
              <Text style={[styles.renewDesc, { color: colors.mutedForeground }]}>Your plan renews automatically each month.</Text>
            </View>
            <Switch
              value={autoRenew}
              onValueChange={setAutoRenew}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor={colors.card}
            />
          </View>

          <View style={styles.secureRow}>
            <Feather name="lock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.secureText, { color: colors.mutedForeground }]}>
              Demo only. No real payment is taken and your full card number is never stored.
            </Text>
          </View>

          {error && <Text style={[styles.error, { color: colors.primary }]}>{error}</Text>}
        </>
      )}
    </ScrollView>
    <View
      style={[
        styles.footer,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'web' ? 24 : insets.bottom + 12,
        },
      ]}
    >
      {step === 1 ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: detailsValid ? colors.primary : colors.muted }]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Continue</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleSubscribe}
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Subscribe &amp; Begin Journey</Text>
        </TouchableOpacity>
      )}
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  title: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    marginBottom: 32,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
  },
  modePrice: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    marginTop: 16,
  },
  spacer: {
    height: 32,
  },
  button: {
    borderRadius: 30,
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    marginBottom: 28,
  },
  planName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
  },
  planDesc: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 4,
  },
  planPrice: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
  },
  planPer: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  renewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  renewTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
  },
  renewDesc: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  secureText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
});
