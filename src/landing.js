import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';


export default function Landing() {
    const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <View >
        <LottieView
          source={require('../assets/landing.json')}
          autoPlay
          loop
          style={styles.animation}
        />

      <Text style={styles.logo}>
        BridgeTalk
        <Text style={{ color: '#6f3ff5' }}>.</Text>
      </Text>

      
       {/*  <Text style={styles.welcomeText}>Welcome</Text> */}
        <Text style={styles.msg}>No matter the language, your message matters — BridgeTalk ensures you're always understood.</Text>
        <TouchableOpacity style={styles.button}onPress={() => navigation.navigate('Home')}>
        <LinearGradient
            colors={['#3f80f5', '#6f3ff5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBar}
        >
        <Text style={styles.buttonText}>Get Started</Text>
        </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 38,
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 50,
    marginTop: -10,
   
    marginLeft: 70,
    fontFamily: 'monospace',
    alignItems: 'center',
  },
 /*  card: {
    backgroundColor: '#2c2c2e',
    width: '90%',
    
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 30,
  }, */
  animation: {
    width: 300,
    height: 190,
    marginBottom: 40,
    marginTop: -40,
    alignSelf: 'center',
  },
  welcomeText: {
    color: 'white',
    fontSize: 35,
    fontFamily: 'monospace',
    marginBottom: 70,
    marginTop: -40,
  },
  gradientBar: {
    width: '80%',
    height: 45,
    borderRadius: 10,
    marginTop: 20,
  },
  msg: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'monospace',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: -20,
  
  },
  button: {
  width: '80%',
  borderRadius: 25,
  overflow: 'hidden',
  marginTop: 30,
},

gradientBar: {
  paddingVertical: 12,
  paddingHorizontal: 50,
  borderRadius: 25,
  alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 70,
},

buttonText: {
  color: 'white',
  fontSize: 16,
  textAlign: 'center',
  fontWeight: '600',
  fontFamily: 'monospace',
},

});
