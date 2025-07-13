// src/components/CustomAlert.tsx
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scale, verticalScale, moderateScale } from '@/utils/metrics';
import colors from '@/components/colors'

const { width } = Dimensions.get('window');

// تعريف أنواع التنبيه
type AlertType = 'success' | 'error' | 'info' | 'warning';

// تعريف الواجهة للطرق التي سيكشفها الـ ref
export interface CustomAlertRef {
  show: (message: string, type?: AlertType, duration?: number, title?: string) => void;
}

// استخدام forwardRef للسماح للمكونات الأبوية بالوصول إلى طرق عبر الـ ref
const CustomAlert = forwardRef<CustomAlertRef, {}>((props, ref) => {
// جلب الألوان المتوافقة مع الثيم
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AlertType>('info'); // النوع الافتراضي
  const fadeAnim = useRef(new Animated.Value(0)).current; // للرسوم المتحركة (Fade-in/out)
  const slideAnim = useRef(new Animated.Value(-verticalScale(100))).current; // للرسوم المتحركة (Slide-down/up)

  // كشف طريقة 'show' للمكون الأب عبر الـ ref
  useImperativeHandle(ref, () => ({
    show: (msg, alertType = 'info', duration = 3000, alertTitle = '') => {
      setMessage(msg);
      setType(alertType);
      setTitle(alertTitle);
      setIsVisible(true);

      // إعادة تعيين الرسوم المتحركة
      fadeAnim.setValue(0);
      slideAnim.setValue(-verticalScale(100));

      // بدء الرسوم المتحركة
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.timing(slideAnim, {
          toValue: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + verticalScale(10) : verticalScale(50), // تحديد الموضع أسفل شريط الحالة/النوتش
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]).start(() => {
        // إخفاء تلقائي بعد المدة المحددة
        if (duration > 0) {
          setTimeout(() => {
            hide();
          }, duration);
        }
      });
    },
  }));

  // دالة لإخفاء التنبيه
  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
      Animated.timing(slideAnim, {
        toValue: -verticalScale(100),
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(() => {
      setIsVisible(false);
      setMessage('');
      setTitle('');
    });
  }, [fadeAnim, slideAnim]);

  // تحديد الأنماط الخاصة بالتنبيه (الألوان، الأيقونات)
  const getAlertStyles = useCallback(() => {
    let backgroundColor = colors.info;
    let iconName: keyof typeof Ionicons.glyphMap = 'information-circle-outline';
    let textColor = colors.white; // لون النص الافتراضي للتنبيه

    switch (type) {
      case 'success':
        backgroundColor = colors.success;
        iconName = 'checkmark-circle-outline';
        textColor = colors.textPrimary; // قد يبدو نص النجاح أفضل بلون داكن
        break;
      case 'error':
        backgroundColor = colors.red;
        iconName = 'close-circle-outline';
        textColor = colors.white;
        break;
      case 'warning':
        backgroundColor = colors.warning;
        iconName = 'warning-outline';
        textColor = colors.textPrimary; // قد يبدو نص التحذير أفضل بلون داكن
        break;
      case 'info':
      default:
        backgroundColor = colors.info;
        iconName = 'information-circle-outline';
        textColor = colors.white;
        break;
    }
    return { backgroundColor, iconName, textColor };
  }, [type, colors]);

  const { backgroundColor, iconName, textColor } = getAlertStyles();

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.alertContainer,
        { backgroundColor: backgroundColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.contentWrapper}>
        <Ionicons name={iconName} size={moderateScale(24)} color={textColor} style={styles.icon} />
        <View style={styles.textWrapper}>
          {title ? <Text style={[styles.alertTitle, { color: textColor }]}>{title}</Text> : null}
          <Text style={[styles.alertMessage, { color: textColor }]}>{message}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={hide} style={styles.closeButton}>
        <Ionicons name="close" size={moderateScale(20)} color={textColor} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  alertContainer: {
    position: 'absolute',
    left: scale(10),
    right: scale(10),
    zIndex: 1000, // تأكد من أنه يظهر فوق المحتوى الآخر
    borderRadius: moderateScale(10),
    padding: moderateScale(15),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(5),
    elevation: 8,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: scale(10), // مسافة لزر الإغلاق
  },
  icon: {
    marginRight: scale(10),
  },
  textWrapper: {
    flex: 1,
  },
  alertTitle: {
    fontFamily: 'tajawal-bold',
    fontSize: moderateScale(16),
    marginBottom: verticalScale(2),
    textAlign: 'right', // RTL
  },
  alertMessage: {
    fontFamily: 'tajawal-medium',
    fontSize: moderateScale(14),
    textAlign: 'right', // RTL
  },
  closeButton: {
    padding: scale(5),
  },
});

export default CustomAlert;
