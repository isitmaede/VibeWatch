import { Stack } from "expo-router";
import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from "expo-router";
export default function Layout() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'tajawal-bold': require('@/assets/fonts/Tajawal-Bold.ttf'),
        'tajawal-medium': require('@/assets/fonts/Tajawal-Medium.ttf'),
        'tajawa-regular': require('@/assets/fonts/Tajawal-Regular.ttf'),
        'Inter-Bold': require('@/assets/fonts/Inter-Bold.ttf'),
        'Poppins-Bold.ttf': require('@/assets/fonts/Poppins-Bold.ttf'),
        'IBMP': require('@/assets/fonts/IBMPlexArabic-Text.ttf'),
        
        
      });
      setLoaded(true);
    }
    loadFonts();
  }, []);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="purple" size="large" />
      </View>
    );
  }
 
  return <Slot />;
}

