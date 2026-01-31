import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());

  const faqData: FAQItem[] = [
    {
      id: '1',
      question: 'What is this platform?',
      answer: 'This is a comprehensive trading and financial services platform that offers various features including trading, loans, and more.',
    },
    {
      id: '2',
      question: 'How do I get started?',
      answer: 'Simply create an account, complete your profile verification, and you can start using all the platform features.',
    },
    {
      id: '3',
      question: 'How do I make a deposit?',
      answer: 'You can make deposits through various payment methods available in your account dashboard. Navigate to your account section and select "Deposit" to see all available options.',
    },
    {
      id: '4',
      question: 'How long does withdrawal take?',
      answer: 'Withdrawals are typically processed within 24-48 hours, depending on the payment method you choose.',
    },
    {
      id: '5',
      question: 'Is my account secure?',
      answer: 'Yes, we use industry-standard encryption and security measures to protect your account and personal information.',
    },
    {
      id: '6',
      question: 'How do I contact support?',
      answer: 'You can contact our support team through the Chat feature in the app, or use the Contact Us section for general inquiries.',
    },
    {
      id: '7',
      question: 'What are the trading fees?',
      answer: 'Trading fees vary depending on the type of trade and market conditions. Check the Market section for current fee structures.',
    },
    {
      id: '8',
      question: 'Can I use the platform on mobile?',
      answer: 'Yes, this platform is fully optimized for mobile devices and works seamlessly on both iOS and Android.',
    },
  ];

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQ</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <Text style={styles.sectionSubtitle}>
          Find answers to common questions about our platform
        </Text>

        {faqData.map((item) => {
          const isExpanded = expandedItems.has(item.id);
          return (
            <View key={item.id} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleItem(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.questionText}>{item.question}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  backButtonPlaceholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  faqItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  answerText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    paddingTop: 12,
  },
});

export default FAQScreen;





