import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';

export const Input: React.FC<TextInputProps> = (props) => (
  <TextInput style={styles.input} {...props} />
);

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 8, marginVertical: 6 },
});
