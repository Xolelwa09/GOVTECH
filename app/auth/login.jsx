import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router } from 'expo-router';

import { useAuth } from '../../src/contexts/AuthContext';

export default function LoginScreen() {
  const {
    signIn,
    signOut,
    loading: authLoading,
    isAuthenticated,
    role,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
  email: '',
  password: '',
});

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    navigateByRole(role);
  }, [authLoading, isAuthenticated, role]);

  function navigateByRole(userRole) {
    switch (userRole) {
      case 'DSAC_ADMIN':
        router.replace('/dsac/dashboard');
        break;

      case 'DSAC_REVIEWER':
        router.replace('/reviewer/dashboard');
        break;

      case 'ORG_ADMIN':
      case 'ORG_STAFF':
      case 'EXTERNAL_COLLABORATOR':
        router.replace('/organisation/dashboard');
        break;

      default:
        console.warn(
          'Unknown CIVITRACK role:',
          userRole
        );
        break;
    }
  }
const validateForm = () => {
  const newErrors = {
    email: '',
    password: '',
  };

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  // Email validation
  if (!cleanEmail) {
    newErrors.email = 'Email address is required.';
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    newErrors.email = 'Please enter a valid email address.';
  }

  // Password validation
  if (!cleanPassword) {
    newErrors.password = 'Password is required.';
  } else if (cleanPassword.length < 6) {
    newErrors.password =
      'Password must be at least 6 characters.';
  }

  setErrors(newErrors);

  return !newErrors.email && !newErrors.password;
};
 const handleLogin = async () => {
  if (!validateForm()) {
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  setLoading(true);

    try {
      console.log('CIVITRACK: Starting login...');

     const result = await signIn(
  cleanEmail,
  cleanPassword
);

      if (!result.success) {
        Alert.alert(
          'Login Failed',
          result.error || 'Unable to sign in.'
        );
        return;
      }

      if (!result.profile) {
        await signOut();

        Alert.alert(
          'Access Denied',
          'Your CIVITRACK profile could not be found.'
        );
        return;
      }

      if (!result.profile.is_active) {
        await signOut();

        Alert.alert(
          'Account Inactive',
          'Your CIVITRACK account is inactive.'
        );
        return;
      }

      const userRole = result.profile.role;

      console.log(
        'CIVITRACK: Verified role:',
        userRole
      );

      if (!userRole) {
        await signOut();

        Alert.alert(
          'Access Denied',
          'Your account does not have a CIVITRACK role.'
        );
        return;
      }

      navigateByRole(userRole);

    } catch (error) {
      console.error(
        'CIVITRACK Login Error:',
        error
      );

      Alert.alert(
        'Login Error',
        error?.message ||
          'Something went wrong while signing in.'
      );

    } finally {
      setLoading(false);
    }
  };

  /* ================================================= */
  /* LOADING SCREEN */
  /* ================================================= */

  if (authLoading) {
    return (
      <View style={styles.loadingScreen}>

        <View style={styles.loadingEmblem}>
          <Text style={styles.loadingEmblemText}>
            RSA
          </Text>
        </View>

        <ActivityIndicator
          size="large"
          color="#007A4D"
        />

        <Text style={styles.loadingText}>
          Loading CIVITRACK...
        </Text>

        <Text style={styles.loadingSubText}>
          Department of Sport, Arts and Culture
        </Text>

      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>

      <StatusBar
        barStyle="light-content"
        backgroundColor="#18202A"
      />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ================================================= */}
          {/* SOUTH AFRICAN COLOUR STRIP */}
          {/* ================================================= */}

          <View style={styles.flagStrip}>

            <View style={styles.flagBlack} />

            <View style={styles.flagGold} />

            <View style={styles.flagGreen} />

            <View style={styles.flagBlue} />

            <View style={styles.flagRed} />

          </View>


          {/* ================================================= */}
          {/* GOVERNMENT HEADER */}
          {/* ================================================= */}

          <View style={styles.govHeader}>

            <View style={styles.govIdentity}>

              {/* Temporary RSA emblem */}
              <View style={styles.coatOfArmsContainer}>

                <View style={styles.coatOfArmsPlaceholder}>

                  <Text style={styles.coatOfArmsText}>
                    RSA
                  </Text>

                </View>

              </View>


              <View style={styles.govText}>

                <Text style={styles.republic}>
                  REPUBLIC OF SOUTH AFRICA
                </Text>

                <Text style={styles.department}>
                  DEPARTMENT OF SPORT, ARTS AND CULTURE
                </Text>

                <View style={styles.headerDivider} />

                <Text style={styles.nationalDepartment}>
                  National Department
                </Text>

              </View>

            </View>

          </View>


          {/* ================================================= */}
          {/* CIVITRACK SYSTEM BAR */}
          {/* ================================================= */}

          <View style={styles.systemBar}>

            <View>

              <Text style={styles.systemName}>
                CIVITRACK
              </Text>

              <Text style={styles.systemDescription}>
                Public Funding & Accountability Management System
              </Text>

            </View>


            <View style={styles.systemStatus}>

              <View style={styles.statusDot} />

              <Text style={styles.statusText}>
                SECURE SYSTEM
              </Text>

            </View>

          </View>


          {/* ================================================= */}
          {/* MAIN LOGIN CONTENT */}
          {/* ================================================= */}

          <View style={styles.mainContainer}>

            {/* Breadcrumb */}

            <View style={styles.breadcrumb}>

              <Text style={styles.breadcrumbText}>
                CIVITRACK
              </Text>

              <Text style={styles.breadcrumbDivider}>
                /
              </Text>

              <Text style={styles.breadcrumbCurrent}>
                Secure Access
              </Text>

            </View>


            {/* Introduction */}

            <View style={styles.introduction}>

              <Text style={styles.welcomeTitle}>
                Secure System Access
              </Text>

              <Text style={styles.welcomeText}>
                Sign in to access your departmental
                accountability workspace.
              </Text>

            </View>


            {/* ================================================= */}
            {/* LOGIN CARD */}
            {/* ================================================= */}

            <View style={styles.loginCard}>

              <View style={styles.loginCardTop} />


              <View style={styles.loginHeader}>

                <Text style={styles.loginTitle}>
                  SIGN IN
                </Text>

                <Text style={styles.loginSubtitle}>
                  Authorised users only
                </Text>

              </View>


              {/* EMAIL */}

              <View style={styles.formGroup}>

                <Text style={styles.label}>
                  EMAIL ADDRESS
                </Text>

               <TextInput
  style={[
    styles.input,
    errors.email && styles.inputError,
  ]}
  placeholder="Enter your email address"
  placeholderTextColor="#8A9298"
  value={email}
  onChangeText={(text) => {
    setEmail(text);

    if (errors.email) {
      setErrors((prev) => ({
        ...prev,
        email: '',
      }));
    }
  }}
  autoCapitalize="none"
  autoCorrect={false}
  keyboardType="email-address"
  editable={!loading}
/>

{errors.email ? (
  <Text style={styles.errorText}>
    {errors.email}
  </Text>
) : null}

              </View>


              {/* PASSWORD */}

              <View style={styles.formGroup}>

                <Text style={styles.label}>
                  PASSWORD
                </Text>

               <TextInput
  style={[
    styles.input,
    errors.password && styles.inputError,
  ]}
  placeholder="Enter your password"
  placeholderTextColor="#8A9298"
  value={password}
  onChangeText={(text) => {
    setPassword(text);

    if (errors.password) {
      setErrors((prev) => ({
        ...prev,
        password: '',
      }));
    }
  }}
  secureTextEntry
  autoCapitalize="none"
  autoCorrect={false}
  editable={!loading}
/>

{errors.password ? (
  <Text style={styles.errorText}>
    {errors.password}
  </Text>
) : null}

              </View>


              {/* LOGIN BUTTON */}

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed &&
                    styles.loginButtonPressed,
                  loading &&
                    styles.loginButtonDisabled,
                ]}
              >

                {loading ? (

                  <ActivityIndicator
                    color="#FFFFFF"
                  />

                ) : (

                  <Text style={styles.loginButtonText}>
                    SIGN IN TO CIVITRACK
                  </Text>

                )}

              </Pressable>


              {/* FORGOT PASSWORD */}

              <Pressable
                onPress={() =>
                  router.push(
                    '/auth/forgot-password'
                  )
                }
                disabled={loading}
                style={styles.forgotButton}
              >

                <Text style={styles.forgotText}>
                  Forgot your password?
                </Text>

              </Pressable>

            </View>


            {/* ================================================= */}
            {/* SECURITY NOTICE */}
            {/* ================================================= */}

            <View style={styles.securityBox}>

              <View style={styles.securityIcon}>

                <Text style={styles.securityCheck}>
                  ✓
                </Text>

              </View>


              <View style={styles.securityContent}>

                <Text style={styles.securityTitle}>
                  AUTHORISED ACCESS
                </Text>

                <Text style={styles.securityText}>
                  This system is restricted to authorised
                  Department of Sport, Arts and Culture
                  officials and approved users.
                </Text>

                <Text style={styles.securityWarning}>
                  Unauthorised access or use is prohibited.
                </Text>

              </View>

            </View>


            {/* ================================================= */}
            {/* SYSTEM INFORMATION */}
            {/* ================================================= */}

            <View style={styles.systemInformation}>

              <Text style={styles.infoLabel}>
                SYSTEM
              </Text>

              <Text style={styles.infoValue}>
                CIVITRACK
              </Text>


              <View style={styles.infoDivider} />


              <Text style={styles.infoLabel}>
                DEPARTMENT
              </Text>

              <Text style={styles.infoValue}>
                SPORT, ARTS AND CULTURE
              </Text>


              <View style={styles.infoDivider} />


              <Text style={styles.infoLabel}>
                CURRENT PERIOD
              </Text>

              <Text style={styles.infoValue}>
                2026 / 2027
              </Text>

            </View>

          </View>


          {/* ================================================= */}
          {/* FOOTER */}
          {/* ================================================= */}

          <View style={styles.footer}>

            <Text style={styles.footerRepublic}>
              REPUBLIC OF SOUTH AFRICA
            </Text>

            <Text style={styles.footerDepartment}>
              Department of Sport, Arts and Culture
            </Text>

            <Text style={styles.footerSystem}>
              CIVITRACK — Public Funding & Accountability
              Management System
            </Text>

            <View style={styles.footerLine} />

            <Text style={styles.footerCopyright}>
              © 2026 Department of Sport, Arts and Culture
            </Text>

          </View>

        </ScrollView>

      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}


/* ========================================================= */
/* STYLES */
/* ========================================================= */

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#F2F4F5',
  },

  keyboard: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },


  /* ================================================= */
  /* LOADING */
  /* ================================================= */

  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F4F5',
  },

  loadingEmblem: {
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor: '#18202A',
    borderWidth: 2,
    borderColor: '#D4A72C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },

  loadingEmblemText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },

  loadingText: {
    marginTop: 12,
    color: '#27313A',
    fontSize: 13,
    fontWeight: '700',
  },

  loadingSubText: {
    marginTop: 5,
    color: '#7A848C',
    fontSize: 10,
  },


  /* ================================================= */
  /* FLAG STRIP */
  /* ================================================= */

  flagStrip: {
    height: 6,
    flexDirection: 'row',
  },

  flagBlack: {
    flex: 1,
    backgroundColor: '#000000',
  },

  flagGold: {
    flex: 1,
    backgroundColor: '#FFB612',
  },

  flagGreen: {
    flex: 2,
    backgroundColor: '#007A4D',
  },

  flagBlue: {
    flex: 1,
    backgroundColor: '#001489',
  },

  flagRed: {
    flex: 1,
    backgroundColor: '#DE3831',
  },


  /* ================================================= */
  /* GOVERNMENT HEADER */
  /* ================================================= */

  govHeader: {
    backgroundColor: '#18202A',
    paddingHorizontal: 32,
    paddingVertical: 18,
    minHeight: 105,
    justifyContent: 'center',
  },

  govIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  coatOfArmsContainer: {
    width: 75,
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 17,
  },

  coatOfArmsPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D4A72C',
    justifyContent: 'center',
    alignItems: 'center',
  },

  coatOfArmsText: {
    color: '#18202A',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },

  govText: {
    flex: 1,
  },

  republic: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  department: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 5,
  },

  headerDivider: {
    width: 80,
    height: 2,
    backgroundColor: '#D4A72C',
    marginTop: 8,
    marginBottom: 5,
  },

  nationalDepartment: {
    color: '#AEB7BE',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.6,
  },


  /* ================================================= */
  /* SYSTEM BAR */
  /* ================================================= */

  systemBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 17,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D7DCDF',
  },

  systemName: {
    color: '#18202A',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 2,
  },

  systemDescription: {
    color: '#707A82',
    fontSize: 9,
    marginTop: 3,
  },

  systemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8E5DE',
    backgroundColor: '#F6FAF8',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#007A4D',
    marginRight: 7,
  },

  statusText: {
    color: '#007A4D',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },


  /* ================================================= */
  /* MAIN */
  /* ================================================= */

  mainContainer: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 25,
    paddingVertical: 32,
  },


  /* ================================================= */
  /* BREADCRUMB */
  /* ================================================= */

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  breadcrumbText: {
    color: '#007A4D',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  breadcrumbDivider: {
    color: '#AAB2B8',
    marginHorizontal: 7,
  },

  breadcrumbCurrent: {
    color: '#6E7880',
    fontSize: 8,
    fontWeight: '700',
  },


  /* ================================================= */
  /* INTRODUCTION */
  /* ================================================= */

  introduction: {
    marginBottom: 22,
  },

  welcomeTitle: {
    color: '#18202A',
    fontSize: 25,
    fontWeight: '900',
  },

  welcomeText: {
    color: '#69747D',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 17,
  },


  /* ================================================= */
  /* LOGIN CARD */
  /* ================================================= */

  loginCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6DBDE',
    padding: 30,
    position: 'relative',
    overflow: 'hidden',
  },

  loginCardTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 5,
    backgroundColor: '#007A4D',
  },

  loginHeader: {
    marginBottom: 25,
    marginTop: 4,
  },

  loginTitle: {
    color: '#18202A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  loginSubtitle: {
    color: '#7A848C',
    fontSize: 10,
    marginTop: 5,
  },


  /* ================================================= */
  /* FORM */
  /* ================================================= */

  formGroup: {
    marginBottom: 19,
  },

  label: {
    color: '#3B454D',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 8,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#C8CED2',
    backgroundColor: '#FAFBFB',
    paddingHorizontal: 14,
    color: '#1E272F',
    fontSize: 14,
  },


  /* ================================================= */
  /* LOGIN BUTTON */
  /* ================================================= */

  loginButton: {
    height: 51,
    backgroundColor: '#007A4D',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  loginButtonPressed: {
    opacity: 0.78,
  },

  loginButtonDisabled: {
    opacity: 0.55,
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  forgotButton: {
    alignItems: 'center',
    marginTop: 18,
  },

  forgotText: {
    color: '#007A4D',
    fontSize: 11,
    fontWeight: '700',
  },


  /* ================================================= */
  /* SECURITY NOTICE */
  /* ================================================= */

  securityBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DCDF',
    borderLeftWidth: 4,
    borderLeftColor: '#D4A72C',
    padding: 16,
    flexDirection: 'row',
    marginTop: 17,
  },

  securityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007A4D',
    justifyContent: 'center',
    alignItems: 'center',
  },

  securityCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  securityContent: {
    flex: 1,
    marginLeft: 11,
  },

  securityTitle: {
    color: '#27313A',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  securityText: {
    color: '#69747D',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 5,
  },

  securityWarning: {
    color: '#A04B2C',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 5,
  },


  /* ================================================= */
  /* SYSTEM INFORMATION */
  /* ================================================= */

  systemInformation: {
    backgroundColor: '#E9EDEE',
    borderWidth: 1,
    borderColor: '#D4DADD',
    marginTop: 17,
    padding: 16,
  },

  infoLabel: {
    color: '#78838B',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  infoValue: {
    color: '#27313A',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
  },

  infoDivider: {
    height: 1,
    backgroundColor: '#D2D7DA',
    marginVertical: 10,
  },


  /* ================================================= */
  /* FOOTER */
  /* ================================================= */

  footer: {
    backgroundColor: '#18202A',
    borderTopWidth: 4,
    borderTopColor: '#007A4D',
    paddingVertical: 27,
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  footerRepublic: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  footerDepartment: {
    color: '#D4A72C',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },

  footerSystem: {
    color: '#AAB2B9',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 6,
  },

  footerLine: {
    width: 80,
    height: 1,
    backgroundColor: '#53606B',
    marginVertical: 13,
  },

  footerCopyright: {
    color: '#7F8992',
    fontSize: 8,
  },

  inputError: {
  borderColor: '#C0392B',
  backgroundColor: '#FFF8F7',
},

errorText: {
  color: '#C0392B',
  fontSize: 9,
  fontWeight: '600',
  marginTop: 5,
},
});