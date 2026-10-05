import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

export function AnimatedSplashOverlay() {
  return null;
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Image style={styles.image} source={require('@/assets/images/ip-icon.png')} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  image: {
    width: 104,
    height: 104,
    borderRadius: 32,
  },
});
