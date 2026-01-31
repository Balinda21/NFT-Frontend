import React, { useState } from 'react';
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

interface Section {
  id: string;
  title: string;
  content: string;
  defaultExpanded?: boolean;
}

const AboutUsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    aboutUs: true,
    disclaimer: false,
    aml: false,
    terms: false,
  });

  const sections: Section[] = [
    {
      id: 'aboutUs',
      title: 'about Us:',
      content: `We are committed to building a platform that allows you to be comfortable in cryptocurrency trading and investment, tracking the cryptocurrency traders with the best trading performance, and selecting all trading records of outstanding traders with high transparency and credible past performance to complete. and systematic analysis. Use advanced trading terminals to trade and use AI technology to create fully automated trading robots. Using our advanced trading tools, we create a unique combination of trading strategies based on technical analysis and indicators, as well as personalized settings for each cryptocurrency pair, and these combinations can be completely left to the trading robot. These portfolios are backtested, allowing users to build consistent profitability each month. They are now available to any investor on our platform`,
      defaultExpanded: true,
    },
    {
      id: 'disclaimer',
      title: 'Disclaimer:',
      content: `We solemnly remind you: You acknowledge and agree that, to the extent permitted by law, all our services are provided without any express or implied warranty. We do not represent that this website will meet your needs 100% of the time. We make no warranty or representation that the Service will meet your requirements; will be uninterrupted, timely, secure, or free of defects; that the results that may be obtained from the use of the Service will be accurate or reliable; or that any defects that are known but not discovered will be corrected. correct. We will strive to provide you with services as quickly as possible, but we do not guarantee that access will be uninterrupted or that there will be no delays, failures, errors, omissions or losses in transmitted information. We will use reasonable efforts to ensure that you have normal access to this website in accordance with these terms of use. We may suspend use of the Site for maintenance and will use reasonable efforts to provide notice to you. You acknowledge that this may not be possible in an emergency.`,
    },
    {
      id: 'aml',
      title: 'Anti-Money Laundering Agreement:',
      content: `This agreement is drawn up in accordance with the provisions of the law aimed at reducing the risk of money laundering on virtual currency trading platforms, you need to agree and comply with the following:

1. You undertake to comply with the laws and regulations related to understanding and anti-money laundering in a prudent manner, and shall not violate them intentionally. Within the reasonable control of the platform, we will take the necessary measures and technology to provide you with safe services, as far as possible, so that you are free from suspected money laundering behavior brought about by losses

2. we set and adjust the maximum limit of daily transactions and cash withdrawals in real time according to the security and actual transaction situation

3. If transactions occur too frequently and in a concentrated manner on a particular account, or under other circumstances that are beyond reason, our professional team will evaluate and decide whether they are suspicious or not.

4. in the event that we determine, in our sole judgment, that a transaction is suspicious, we may suspend the transaction, refuse the transaction, and take other restrictive measures, or even reverse the transaction as soon as possible if possible, and report the transaction to the competent authorities, but without notifying you

5. we reserve the right to reject applications from persons from jurisdictions that do not comply with international anti-money laundering standards or from politically exposed persons, and to suspend or terminate a transaction that we deem suspicious, provided that we do not breach our obligations and liabilities to you.`,
    },
    {
      id: 'terms',
      title: 'Terms of Service:',
      content: `Account Holder Representations and Warranties

By registering for an account, the account holder expressly represents and warrants that they:

Have accepted these Terms of Use;

Comply with the rules and laws of their country of residence and/or the country in which they access the Site and the Services, and ensure that their use of the Services does not violate any such laws or regulations applicable to them in any jurisdiction;

is responsible for ensuring that his/her use of the Services complies with all applicable local, provincial and federal laws and regulations;

Is at least 18 years of age, is authorized to accept these Terms of Use and to engage in transactions involving cryptocurrencies, and is of sound mind and able to take responsibility for his/her actions;

Agree to provide accurate, current and complete information to the Platform as prompted by the account creation process and to update our records from time to time when the information submitted is out of date or no longer accurate;

Are responsible for maintaining the confidentiality of their account information and all activities that occur under their account;

Use funds through the Platform that belong to the account holder and come from legitimate sources;

Not to use funds through this Platform that originate from drug trafficking, kidnapping, terrorist activities or any other criminal activity that is illegal or may be considered illegal by any relevant authority;

is not a Politically Exposed Person (PEP) and is not related to a PEP (e.g. relative, colleague, etc.). If this statement is untrue or inaccurate, please contact the Platform to find out how to continue using the Services;

Conduct transactions in a manner that does not infringe the rights of any third party or applicable law;

will only use the Services to perform transactions in accordance with the conditions set out in these Terms and that they are duly authorized and competent to perform transactions on the Website;

will only withdraw any cryptocurrency from their account to their proprietary wallet. The Platform is not responsible for verifying ownership of any wallet or any consequences of incorrect or fraudulent withdrawals to an account.

You acknowledge and agree that you will not use the Platform to access content and data that is unsuitable for you; attempt to interfere with, interrupt or disable the proper working of the Platform and/or its users; promote or engage in any illegal or unlawful activity; or otherwise monetize the Platform and/or its Services and its intellectual property rights and the intellectual property rights of its users (including trading strategies).`,
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const renderSection = (section: Section) => {
    const isExpanded = expandedSections[section.id];
    const previewText = section.content.substring(0, 100) + '...';

    return (
      <View key={section.id} style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.id)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionStripe} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          {isExpanded ? (
            <Text style={styles.expandIcon}>--</Text>
          ) : (
            <Ionicons
              name="add"
              size={24}
              color={colors.textPrimary}
            />
          )}
        </TouchableOpacity>
        {isExpanded ? (
          <Text style={styles.sectionContent}>{section.content}</Text>
        ) : (
          <Text style={styles.sectionPreview}>{previewText}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => renderSection(section))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 24,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionStripe: {
    width: 3,
    height: 20,
    backgroundColor: colors.accent,
    borderRadius: 1.5,
    marginRight: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sectionContent: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionPreview: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  expandIcon: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AboutUsScreen;
