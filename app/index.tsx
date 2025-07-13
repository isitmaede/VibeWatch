// src/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, I18nManager } from 'react-native';
import { useRouter } from 'expo-router';
import { scale, verticalScale, moderateScale } from '../utils/metrics'; // Assuming these are correctly implemented
import colors from '@/components/colors'; // Your defined colors

// Get screen dimensions for more robust centering
const { height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const initApp = async () => {
      try {
        // Simulate any initial loading or data fetching
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Navigate to the home tab after the splash screen
        router.replace('/pages/main');
      } catch (err: any) {
        // Log the error instead of using Alert.alert for better compatibility
        console.error('An unexpected error occurred during app initialization:', err);
        // Optionally, you could show a user-friendly message on the screen
        // or attempt to navigate anyway if the error is non-critical.
        router.replace('/pages/main'); // Attempt to proceed even on error
      }
    };

    initApp();
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/yespng.png')} // Ensure this path is correct
        style={styles.logo}
        resizeMode="contain" // Use 'contain' to ensure the whole logo is visible
      />
      <View style={styles.infoContainer}>
        <Text style={styles.info}>
          Movies don’t just entertain — they understand us.
        </Text>
      </View>
      <Text style={styles.companyText}>From MaedeDev</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0E17", // Using primary pink for the splash background
    alignItems: 'center', // Center horizontally
    justifyContent: 'center', // Center vertically
    paddingHorizontal: scale(20), // Add some horizontal padding
  },
  logo: {
    width: scale(200), // Adjusted size for responsiveness
    height: verticalScale(200), // Adjusted size for responsiveness
    marginBottom: verticalScale(30), // Space below the logo
    borderRadius: moderateScale(30), // Softer, more feminine rounded corners for the logo
    // Removed borderTopLeftRadius as it was specific and less flexible
  },
  infoContainer: {
    // This view helps center the text block if it has a specific width
    width: '80%', // Make it responsive to screen width
    alignItems: 'center', // Center text within its container
  },
  info: {
    color: colors.gray, // Light color for text on pink background
    fontFamily: 'tajawa-regular', // Using tajawal-bold as specified
    fontSize: moderateScale(14), // Dynamic font size
    textAlign: 'center', // Center the text
     // Improve readability
  },
  companyText: {
    position: 'absolute',
    bottom: verticalScale(50), // Adjusted position from bottom
    color: colors.gray, // Using a readable brown from your palette
    fontSize: moderateScale(13), // Dynamic font size
    fontFamily: 'Inter-Bold', // Using tajawal-medium for consistency
    textAlign: 'center', // Ensure it's centered
    width: '100%', // Take full width to ensure centering works
  },
  // subtitle style was not used, so it's kept but not applied
  subtitle: {
    color: colors.textPrimary,
    fontFamily: 'Inter-Bold',
  },
});