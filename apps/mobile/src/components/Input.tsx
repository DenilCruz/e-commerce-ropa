import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  Text,
} from 'react-native';

interface CustomInputProps extends TextInputProps {
  isPassword?: boolean;
}

export const Input: React.FC<CustomInputProps> = ({ isPassword, secureTextEntry, style, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  if (isPassword || secureTextEntry !== undefined) {
    return (
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, style]}
          secureTextEntry={!showPassword}
          {...props}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
          activeOpacity={0.7}
        >
          <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <TextInput style={[styles.input, style]} {...props} />;
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#111827',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginVertical: 6,
    backgroundColor: '#ffffff',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },
});
