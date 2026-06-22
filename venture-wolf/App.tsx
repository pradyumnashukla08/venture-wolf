import React from 'react';
import { Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './src/constants/theme';
import { ProfileProvider, useProfile } from './src/context/ProfileContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import * as Linking from 'expo-linking';

// Screen Imports
import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { FounderHome } from './src/screens/FounderHome';
import { AICommittee } from './src/screens/AICommittee';
import { Workspace } from './src/screens/Workspace';
import { MarketOpportunityScreen } from './src/screens/MarketOpportunityScreen';
import { TractionGrowthScreen } from './src/screens/TractionGrowthScreen';
import { DataRoomScreen } from './src/screens/DataRoomScreen';
import { DeckDiagnosticScreen } from './src/screens/DeckDiagnosticScreen';
import { MatchmakingScreen } from './src/screens/MatchmakingScreen';
import { InvestorDetailScreen } from './src/screens/InvestorDetailScreen';
import { AIReviewScreen } from './src/screens/AIReviewScreen';
import { FounderProfileEditor } from './src/screens/FounderProfileEditor';
import { FinancialCommandCenter } from './src/screens/FinancialCommandCenter';
import { MentorsDirectoryScreen } from './src/screens/MentorsDirectoryScreen';
import { MentorBookingScreen } from './src/screens/MentorBookingScreen';
import { PitchPracticeScreen } from './src/screens/PitchPracticeScreen';
import { GTMStrategyScreen } from './src/screens/GTMStrategyScreen';
import { LegalDocsScreen } from './src/screens/LegalDocsScreen';

import { InvestorHomeFeed } from './src/screens/InvestorHomeFeed';
import { DealFlowPipeline } from './src/screens/DealFlowPipeline';
import { UnifiedEvaluationHub } from './src/screens/UnifiedEvaluationHub';
import { DueDiligenceScreen } from './src/screens/DueDiligenceScreen';
import { FunnelPipelineScreen } from './src/screens/FunnelPipelineScreen';
import { ActionPlanScreen } from './src/screens/ActionPlanScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function FounderTabs() {
  const { profileImage } = useProfile();
  const { session } = useAuth();
  const avatarUrl = profileImage || session?.user?.user_metadata?.avatar_url;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Profile' && avatarUrl) {
            return (
              <Image 
                source={{ uri: avatarUrl }} 
                style={{ width: size, height: size, borderRadius: size / 2, borderWidth: focused ? 2 : 0, borderColor: theme.colors.primary }} 
              />
            );
          }

          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Startup') iconName = focused ? 'rocket' : 'rocket-outline';
          else if (route.name === 'AI Review') iconName = focused ? 'sparkles' : 'sparkles-outline';
          else if (route.name === 'Investors') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        headerStyle: { backgroundColor: '#02040A' },
        headerTintColor: theme.colors.darkText,
        tabBarStyle: { backgroundColor: '#02040A', borderTopColor: 'rgba(255,255,255,0.05)' },
        tabBarActiveTintColor: '#06B6D4',
        tabBarInactiveTintColor: '#475569',
      })}
    >
      <Tab.Screen name="Home" component={FounderHome} />
      <Tab.Screen name="Startup" component={Workspace} />
      <Tab.Screen name="AI Review" component={AIReviewScreen} />
      <Tab.Screen name="Investors" component={MatchmakingScreen} />
      <Tab.Screen name="Profile" component={FounderProfileEditor} />
    </Tab.Navigator>
  );
}

function InvestorTabs() {
  const { profileImage } = useProfile();
  const { session } = useAuth();
  const avatarUrl = profileImage || session?.user?.user_metadata?.avatar_url;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Profile' && avatarUrl) {
            return (
              <Image 
                source={{ uri: avatarUrl }} 
                style={{ width: size, height: size, borderRadius: size / 2, borderWidth: focused ? 2 : 0, borderColor: theme.colors.secondary }} 
              />
            );
          }

          let iconName: keyof typeof Ionicons.glyphMap = 'help-circle';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Deal Flow') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Pipeline') iconName = focused ? 'layers' : 'layers-outline';
          else if (route.name === 'Network') iconName = focused ? 'globe' : 'globe-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        headerStyle: { backgroundColor: theme.colors.darkSurface },
        headerTintColor: theme.colors.darkText,
        tabBarStyle: { backgroundColor: theme.colors.darkSurface, borderTopColor: theme.colors.darkBorder },
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.darkTextMuted,
      })}
    >
      <Tab.Screen name="Home" component={InvestorHomeFeed} />
      <Tab.Screen name="Deal Flow" component={DealFlowPipeline} />
      <Tab.Screen name="Pipeline" component={FunnelPipelineScreen} />
      <Tab.Screen name="Network" component={AICommittee} options={{ title: 'Network (AI)' }} />
      <Tab.Screen name="Profile" component={FounderProfileEditor} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

const linking = {
  prefixes: [Linking.createURL('/'), 'venturewolf://', 'https://*.venturewolf.com'],
  config: {
    screens: {
      Login: 'login',
      ResetPassword: 'reset-password',
      DataRoom: 'dataroom',
    },
  },
};

function RootStack() {
  const { isAuthenticated, userRole } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: theme.colors.darkSurface },
        headerTintColor: theme.colors.darkText,
        contentStyle: { backgroundColor: theme.colors.darkBackground },
      }}
    >
      {/* Dynamic Tab Root (Defaulting to FounderTabs if unauthenticated/null) */}
      {userRole === 'investor' ? (
        <Stack.Screen name="InvestorTabs" component={InvestorTabs} options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="FounderTabs" component={FounderTabs} options={{ headerShown: false }} />
      )}

      {/* Authentication Stack (Available as modals/screens anywhere) */}
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false, presentation: 'modal' }} />
      {/* Detail/Stack Screens registered so they can be navigated to from anywhere */}
      <Stack.Screen name="MarketOpportunity" component={MarketOpportunityScreen} options={{ title: 'Market Opportunity', headerShown: false }} />
      <Stack.Screen name="Traction" component={TractionGrowthScreen} options={{ title: 'Traction', headerShown: false }} />
      <Stack.Screen name="ImportCenter" component={DataRoomScreen} options={{ title: 'Import Center', headerShown: false }} />
      <Stack.Screen name="DeckAnalysis" component={DeckDiagnosticScreen} options={{ title: 'Deck Analysis', headerShown: false }} />
      <Stack.Screen name="InvestorProfile" component={InvestorDetailScreen} options={{ title: 'Investor Profile', headerShown: false }} />
      <Stack.Screen name="StartupReview" component={UnifiedEvaluationHub} options={{ title: 'Startup Review', headerShown: false }} />
      <Stack.Screen name="DueDiligence" component={DueDiligenceScreen} options={{ title: 'AI Due Diligence', headerShown: false }} />
      <Stack.Screen name="ActionPlan" component={ActionPlanScreen} options={{ title: 'Action Plan', headerShown: false }} />
      <Stack.Screen name="AICommittee" component={AICommittee} options={{ title: 'AI Investment Committee', headerShown: false }} />
      <Stack.Screen name="FinancialCommand" component={FinancialCommandCenter} options={{ title: 'Financial Command', headerShown: false }} />
      <Stack.Screen name="PitchPractice" component={PitchPracticeScreen} options={{ title: 'Pitch Practice', headerShown: false }} />
      <Stack.Screen name="GTMStrategy" component={GTMStrategyScreen} options={{ title: 'GTM Strategy', headerShown: false }} />
      <Stack.Screen name="LegalDocs" component={LegalDocsScreen} options={{ title: 'Legal Standards', headerShown: false }} />
      <Stack.Screen name="MentorsDirectory" component={MentorsDirectoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MentorBooking" component={MentorBookingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="FounderProfile" component={FounderProfileEditor} options={{ title: 'Founder Profile', headerShown: false }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <NavigationContainer linking={linking}>
          <StatusBar style="light" />
          <RootStack />
        </NavigationContainer>
      </ProfileProvider>
    </AuthProvider>
  );
}
