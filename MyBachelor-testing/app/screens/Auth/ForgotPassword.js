// ForgotPassword.js
import React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';

const ForgotPassword = () => {
  const handleReset = () => {
    alert('Password reset link sent!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
      />
      <Button title="Send Reset Link" onPress={handleReset} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, marginBottom: 20 },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, width: '80%', marginBottom: 20, paddingLeft: 8 },
});

export default ForgotPassword;
