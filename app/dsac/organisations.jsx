import React, {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { ROLES } from '../../src/constants/roles';

export default function OrganisationsScreen() {
  const {
    profile,
    user,
    role,
    loading: authLoading,
  } = useAuth();

  const [showForm, setShowForm] = useState(false);

  // Organisation details
  const [organisationName, setOrganisationName] =
    useState('');

  const [organisationType, setOrganisationType] =
    useState('NPO');

  const [registrationNumber, setRegistrationNumber] =
    useState('');

  const [email, setEmail] =
    useState('');

  // First Organisation Admin details
  const [adminFullName, setAdminFullName] =
    useState('');

  const [adminEmail, setAdminEmail] =
    useState('');

  const [adminPassword, setAdminPassword] =
    useState('');

  const [adminPasswordConfirm, setAdminPasswordConfirm] =
    useState('');

  const [adminPasswordVisible, setAdminPasswordVisible] =
    useState(false);

  const [organisations, setOrganisations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  /*
   * Load organisations from Supabase
   */
  const loadOrganisations =
    useCallback(async () => {
      try {
        setLoading(true);

        console.log(
          'LOAD ORGANISATIONS: starting'
        );

        const {
          data,
          error,
        } = await supabase
          .from('organisations')
          .select(`
            id,
            name,
            organisation_type,
            registration_number,
            email,
            phone,
            province,
            status,
            created_at
          `)
          .order('created_at', {
            ascending: false,
          });

        console.log(
          'LOAD ORGANISATIONS: response',
          {
            data,
            error,
          }
        );

        if (error) {
          throw error;
        }

        setOrganisations(
          data || []
        );
      } catch (error) {
        console.error(
          'Organisation loading error:',
          error
        );

        Alert.alert(
          'Unable to Load',
          'Organisations could not be loaded from Supabase.'
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useFocusEffect(
    useCallback(() => {
      if (
        !authLoading &&
        user &&
        role === ROLES.DSAC_ADMIN
      ) {
        loadOrganisations();
      }
    }, [
      authLoading,
      user,
      role,
      loadOrganisations,
    ])
  );

  /*
   * Reset the complete organisation form
   */
  const resetForm = () => {
    setOrganisationName('');
    setOrganisationType('NPO');
    setRegistrationNumber('');
    setEmail('');

    setAdminFullName('');
    setAdminEmail('');
    setAdminPassword('');
    setAdminPasswordConfirm('');
    setAdminPasswordVisible(false);

    setShowForm(false);
  };

  /*
   * Create organisation + first Organisation Admin
   */
  const createOrganisation =
    async () => {
      console.log(
        'CREATE ORGANISATION: BUTTON FUNCTION STARTED'
      );

      /*
       * Make sure the user is authenticated
       */
      if (!user) {
        console.log(
          'CREATE ORGANISATION: NO USER'
        );

        Alert.alert(
          'Authentication Required',
          'You must be signed in to create an organisation.'
        );

        return;
      }

      console.log(
        'CREATE ORGANISATION: USER FOUND',
        user.id
      );

      /*
       * Make sure user is DSAC Admin
       */
      if (
        role !== ROLES.DSAC_ADMIN
      ) {
        console.log(
          'CREATE ORGANISATION: ACCESS DENIED',
          role
        );

        Alert.alert(
          'Access Denied',
          'Only a DSAC administrator can create organisations.'
        );

        return;
      }

      console.log(
        'CREATE ORGANISATION: DSAC ADMIN VERIFIED'
      );

      /*
       * Organisation validation
       */
      if (
        !organisationName.trim() ||
        !registrationNumber.trim() ||
        !email.trim()
      ) {
        console.log(
          'CREATE ORGANISATION: ORGANISATION VALIDATION FAILED'
        );

        Alert.alert(
          'Missing Organisation Information',
          'Please complete the organisation name, registration number and organisation email.'
        );

        return;
      }

      /*
       * Correct email validation
       */
      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailPattern.test(
          email.trim()
        )
      ) {
        console.log(
          'CREATE ORGANISATION: ORGANISATION EMAIL INVALID',
          email
        );

        Alert.alert(
          'Invalid Organisation Email',
          'Please enter a valid organisation email address.'
        );

        return;
      }

      /*
       * Admin validation
       */
      if (
        !adminFullName.trim() ||
        !adminEmail.trim() ||
        !adminPassword ||
        !adminPasswordConfirm
      ) {
        console.log(
          'CREATE ORGANISATION: ADMIN VALIDATION FAILED'
        );

        Alert.alert(
          'Missing Administrator Information',
          'Please complete the Organisation Administrator name, email, password and password confirmation.'
        );

        return;
      }

      /*
       * Admin email validation
       */
      if (
        !emailPattern.test(
          adminEmail.trim()
        )
      ) {
        console.log(
          'CREATE ORGANISATION: ADMIN EMAIL INVALID',
          adminEmail
        );

        Alert.alert(
          'Invalid Administrator Email',
          'Please enter a valid Organisation Administrator email address.'
        );

        return;
      }

      /*
       * Password validation
       */
      if (
        adminPassword.length < 8
      ) {
        console.log(
          'CREATE ORGANISATION: PASSWORD TOO SHORT'
        );

        Alert.alert(
          'Password Too Short',
          'The temporary password must contain at least 8 characters.'
        );

        return;
      }

      /*
       * Confirm password
       */
      if (
        adminPassword !==
        adminPasswordConfirm
      ) {
        console.log(
          'CREATE ORGANISATION: PASSWORDS DO NOT MATCH'
        );

        Alert.alert(
          'Passwords Do Not Match',
          'The temporary password and confirmation password must match.'
        );

        return;
      }

      console.log(
        'CREATE ORGANISATION: ALL VALIDATION PASSED'
      );

      try {
        setSaving(true);

        console.log(
          'CREATE ORGANISATION: SAVING STATE ENABLED'
        );

        /*
         * --------------------------------
         * CHECK DUPLICATE REGISTRATION
         * --------------------------------
         */

        console.log(
          'CREATE ORGANISATION: CHECKING DUPLICATE REGISTRATION'
        );

        const {
          data: existingOrganisation,
          error: duplicateError,
        } = await supabase
          .from('organisations')
          .select('id')
          .eq(
            'registration_number',
            registrationNumber.trim()
          )
          .maybeSingle();

        console.log(
          'CREATE ORGANISATION: DUPLICATE CHECK RESPONSE',
          {
            existingOrganisation,
            duplicateError,
          }
        );

        if (duplicateError) {
          throw duplicateError;
        }

        if (existingOrganisation) {
          console.log(
            'CREATE ORGANISATION: DUPLICATE FOUND'
          );

          Alert.alert(
            'Organisation Already Exists',
            'An organisation with this registration number already exists.'
          );

          return;
        }

        /*
         * --------------------------------
         * CREATE ORGANISATION
         * --------------------------------
         */

        console.log(
          'CREATE ORGANISATION: ABOUT TO INSERT ORGANISATION'
        );

        const {
          data,
          error,
        } = await supabase
          .from('organisations')
          .insert({
            name:
              organisationName.trim(),

            organisation_type:
              organisationType,

            registration_number:
              registrationNumber.trim(),

            email:
              email.trim().toLowerCase(),

            status:
              'ACTIVE',

            created_by:
              profile?.id || user.id,
          })
          .select()
          .single();

        console.log(
          'CREATE ORGANISATION: ORGANISATION INSERT FINISHED'
        );

        console.log(
          'CREATE ORGANISATION: INSERT DATA',
          data
        );

        console.log(
          'CREATE ORGANISATION: INSERT ERROR',
          error
        );

        if (error) {
          console.error(
            'Organisation insert error:',
            error
          );

          throw error;
        }

        if (!data?.id) {
          throw new Error(
            'The organisation was created but its ID could not be retrieved.'
          );
        }

        console.log(
          'CREATE ORGANISATION: ORGANISATION CREATED SUCCESSFULLY',
          data.id
        );

        /*
         * --------------------------------
         * CREATE ORGANISATION ADMIN
         * --------------------------------
         *
         * Password is sent only to the
         * secure server-side Edge Function.
         */

        console.log(
          'CREATE ORGANISATION: CALLING EDGE FUNCTION'
        );

        console.log(
          'CREATE ORGANISATION: FUNCTION PAYLOAD',
          {
            organisationId: data.id,
            fullName:
              adminFullName.trim(),
            email:
              adminEmail.trim().toLowerCase(),
          }
        );

        const {
          data: functionData,
          error: functionError,
        } =
          await supabase.functions.invoke(
            'create-organisation-admin',
            {
              body: {
                organisationId:
                  data.id,

                fullName:
                  adminFullName.trim(),

                email:
                  adminEmail.trim().toLowerCase(),

                password:
                  adminPassword,
              },
            }
          );

        console.log(
          'CREATE ORGANISATION: EDGE FUNCTION FINISHED'
        );

        console.log(
          'CREATE ORGANISATION: EDGE FUNCTION DATA',
          functionData
        );

        console.log(
          'CREATE ORGANISATION: EDGE FUNCTION ERROR',
          functionError
        );

        /*
         * --------------------------------
         * EDGE FUNCTION ERROR
         * --------------------------------
         */

        if (functionError) {
          console.error(
            'Organisation admin function error:',
            functionError
          );

          Alert.alert(
            'Administrator Creation Failed',
            `The organisation "${data.name}" was created, but the Organisation Administrator could not be created.\n\n${functionError.message || 'Please check the Edge Function.'}`
          );

          await loadOrganisations();

          return;
        }

        /*
         * --------------------------------
         * EDGE FUNCTION RESPONSE ERROR
         * --------------------------------
         */

        if (
          !functionData?.success
        ) {
          console.error(
            'Organisation admin provisioning failed:',
            functionData
          );

          Alert.alert(
            'Administrator Creation Failed',
            functionData?.error ||
              'The Organisation Administrator could not be created.'
          );

          await loadOrganisations();

          return;
        }

        /*
         * --------------------------------
         * EVERYTHING SUCCESSFUL
         * --------------------------------
         */

        console.log(
          'CREATE ORGANISATION: EVERYTHING SUCCESSFUL'
        );

        Alert.alert(
          'Organisation Created Successfully',
          `${data.name} has been registered in CIVITRACK and ${adminFullName.trim()} has been created as the Organisation Administrator.`
        );

        /*
         * Reset form
         */
        resetForm();

        /*
         * Reload organisations
         */
        await loadOrganisations();

      } catch (error) {
        console.error(
          'Organisation creation error:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : 'The organisation could not be created.';

        Alert.alert(
          'Creation Failed',
          message
        );

      } finally {
        console.log(
          'CREATE ORGANISATION: SAVING STATE DISABLED'
        );

        setSaving(false);
      }
    };

  /*
   * Format date for display
   */
  const formatDate =
    (date) => {
      if (!date) {
        return '—';
      }

      const value =
        new Date(date);

      if (
        Number.isNaN(
          value.getTime()
        )
      ) {
        return '—';
      }

      return value.toLocaleDateString(
        'en-ZA',
        {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }
      );
    };

  /*
   * Authentication loading state
   */
  if (authLoading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#111111"
        />

        <View
          style={styles.loadingState}
        >
          <ActivityIndicator
            size="large"
            color="#007A4D"
          />

          <Text
            style={styles.loadingText}
          >
            Checking administrator access...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * User is not authenticated
   */
  if (!user) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#111111"
        />

        <View
          style={styles.emptyState}
        >
          <Text
            style={styles.emptyTitle}
          >
            Authentication Required
          </Text>

          <Text
            style={styles.emptyText}
          >
            Please sign in before accessing organisation management.
          </Text>

          <Pressable
            style={styles.emptyButton}
            onPress={() =>
              router.replace(
                '/auth/login'
              )
            }
          >
            <Text
              style={
                styles.emptyButtonText
              }
            >
              GO TO LOGIN
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * User is authenticated but not DSAC Admin
   */
  if (
    role !== ROLES.DSAC_ADMIN
  ) {
      return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >

        {/* =====================================================
            SOUTH AFRICAN FLAG STRIP
        ===================================================== */}

        <View style={styles.flagStrip}>
          <View
            style={[
              styles.flagSection,
              styles.flagRed,
            ]}
          />

          <View
            style={[
              styles.flagSection,
              styles.flagWhite,
            ]}
          />

          <View
            style={[
              styles.flagSection,
              styles.flagGreen,
            ]}
          />

          <View
            style={[
              styles.flagSection,
              styles.flagGold,
            ]}
          />

          <View
            style={[
              styles.flagSection,
              styles.flagBlue,
            ]}
          />

          <View
            style={[
              styles.flagSection,
              styles.flagBlack,
            ]}
          />
        </View>

        {/* =====================================================
            TOP GOVERNMENT HEADER
        ===================================================== */}

        <View
          style={[
            styles.topHeader,
            !isDesktop && styles.topHeaderTablet,
          ]}
        >

          {/* Government identity */}

          <View style={styles.brandArea}>

            <View style={styles.coatContainer}>
              <Image
                source={require('../../assets/images/sa.jpg')}
                style={styles.coatOfArms}
                resizeMode="contain"
              />
            </View>

            <View style={styles.brandText}>

              <Text style={styles.brandTitle}>
                sport, arts & culture
              </Text>

              <Text style={styles.departmentText}>
                Department:
              </Text>

              <Text style={styles.departmentText}>
                Sport, Arts and Culture
              </Text>

              <Text style={styles.republicText}>
                REPUBLIC OF SOUTH AFRICA
              </Text>

            </View>

          </View>

          {/* Government slogan */}

          {isDesktop && (
            <View style={styles.sloganArea}>

              <Text style={styles.slogan}>
                INSPIRING A NATION OF WINNERS
              </Text>

              <View style={styles.sloganLine} />

            </View>
          )}

          {/* Current user */}

          <View style={styles.userArea}>

            <Text style={styles.userSmall}>
              SYSTEM USER
            </Text>

            <Text style={styles.userRole}>
              DSAC ADMINISTRATOR
            </Text>

            <Text style={styles.userEmail}>
              {profile?.email || 'Administrator'}
            </Text>

            <Pressable
              onPress={() =>
                router.replace('/dsac/dashboard')
              }
              style={({ pressed }) => [
                styles.dashboardButton,
                pressed && styles.dashboardButtonPressed,
              ]}
            >
              <Text style={styles.dashboardButtonText}>
                DASHBOARD
              </Text>
            </Pressable>

          </View>

        </View>

        {/* =====================================================
            CIVITRACK SYSTEM BAR
        ===================================================== */}

        <View style={styles.systemBar}>

          <View>
            <Text style={styles.systemName}>
              CIVITRACK
            </Text>

            <Text style={styles.systemDescription}>
              Public Funding & Accountability Management System
            </Text>
          </View>

          <View style={styles.systemRight}>

            <View style={styles.flagMini}>
              <View style={styles.miniRed} />
              <View style={styles.miniGreen} />
              <View style={styles.miniBlue} />
            </View>

            <View style={styles.statusBox}>

              <View style={styles.statusDot} />

              <View>
                <Text style={styles.statusLabel}>
                  SYSTEM STATUS
                </Text>

                <Text style={styles.statusValue}>
                  OPERATIONAL
                </Text>
              </View>

            </View>

          </View>

        </View>

        {/* =====================================================
            MAIN NAVIGATION
        ===================================================== */}

        <View style={styles.navigation}>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              router.push('/dsac/dashboard')
            }
          >
            <Text style={styles.navText}>
              HOME
            </Text>
          </Pressable>

          <View style={styles.navActive}>
            <Text style={styles.navActiveText}>
              ORGANISATIONS
            </Text>
          </View>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              router.push('/dsac/funding-agreements')
            }
          >
            <Text style={styles.navText}>
              FUNDING
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              router.push('/dsac/cases')
            }
          >
            <Text style={styles.navText}>
              ACCOUNTABILITY
            </Text>
          </Pressable>

          <Pressable style={styles.navItem}>
            <Text style={styles.navText}>
              REPORTS
            </Text>
          </Pressable>

          <Pressable style={styles.navItem}>
            <Text style={styles.navText}>
              AUDIT LOG
            </Text>
          </Pressable>

        </View>

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

        <View
          style={[
            styles.main,
            !isDesktop && styles.mainTablet,
          ]}
        >

          {/* Breadcrumb */}

          <View style={styles.breadcrumb}>

            <Pressable
              onPress={() =>
                router.push('/dsac/dashboard')
              }
            >
              <Text style={styles.breadcrumbHome}>
                HOME
              </Text>
            </Pressable>

            <Text style={styles.breadcrumbSlash}>
              /
            </Text>

            <Text style={styles.breadcrumbCurrent}>
              ORGANISATIONS
            </Text>

          </View>

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <View
            style={[
              styles.pageHeader,
              !isDesktop && styles.pageHeaderTablet,
            ]}
          >

            <View style={styles.pageHeadingLeft}>

              <View style={styles.orangeHeadingLine} />

              <Text style={styles.pageTitle}>
                Organisations
              </Text>

              <Text style={styles.pageDescription}>
                Register and manage NPOs and Public Entities
                participating in DSAC-funded programmes.
              </Text>

            </View>

            <Pressable
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
              ]}
              onPress={() =>
                setShowForm(!showForm)
              }
              disabled={saving}
            >
              <Text style={styles.createButtonText}>
                {showForm
                  ? 'CLOSE FORM'
                  : '+ CREATE ORGANISATION'}
              </Text>
            </Pressable>

          </View>

          {/* =================================================
              ORGANISATION REGISTRATION FORM
          ================================================= */}

          {showForm && (
            <View style={styles.formCard}>

              <View style={styles.formHeader}>

                <View style={styles.formHeaderAccent} />

                <View>
                  <Text style={styles.formTitle}>
                    REGISTER ORGANISATION
                  </Text>

                  <Text style={styles.formDescription}>
                    Only authorised DSAC administrators can create
                    organisations and provision their first
                    Organisation Administrator.
                  </Text>
                </View>

              </View>

              {/* Organisation details */}

              <View style={styles.formSection}>

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionOrangeBar} />

                  <View>
                    <Text style={styles.sectionTitle}>
                      ORGANISATION DETAILS
                    </Text>

                    <Text style={styles.sectionSubtitle}>
                      Official registration information
                    </Text>
                  </View>
                </View>

                <View style={styles.formGrid}>

                  <View style={styles.fieldFull}>
                    <Text style={styles.label}>
                      ORGANISATION NAME *
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="Enter organisation name"
                      placeholderTextColor="#888888"
                      value={organisationName}
                      onChangeText={setOrganisationName}
                      editable={!saving}
                    />
                  </View>

                  <View style={styles.fieldFull}>

                    <Text style={styles.label}>
                      ORGANISATION TYPE *
                    </Text>

                    <View style={styles.typeRow}>

                      <Pressable
                        style={[
                          styles.typeButton,
                          organisationType === 'NPO' &&
                            styles.selectedType,
                        ]}
                        onPress={() =>
                          setOrganisationType('NPO')
                        }
                        disabled={saving}
                      >
                        <View
                          style={[
                            styles.typeIndicator,
                            organisationType === 'NPO' &&
                              styles.typeIndicatorSelected,
                          ]}
                        />

                        <Text
                          style={[
                            styles.typeText,
                            organisationType === 'NPO' &&
                              styles.selectedTypeText,
                          ]}
                        >
                          NPO
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.typeButton,
                          organisationType === 'PUBLIC_ENTITY' &&
                            styles.selectedType,
                        ]}
                        onPress={() =>
                          setOrganisationType(
                            'PUBLIC_ENTITY'
                          )
                        }
                        disabled={saving}
                      >
                        <View
                          style={[
                            styles.typeIndicator,
                            organisationType === 'PUBLIC_ENTITY' &&
                              styles.typeIndicatorSelected,
                          ]}
                        />

                        <Text
                          style={[
                            styles.typeText,
                            organisationType === 'PUBLIC_ENTITY' &&
                              styles.selectedTypeText,
                          ]}
                        >
                          PUBLIC ENTITY
                        </Text>
                      </Pressable>

                    </View>

                    <Text style={styles.typeHint}>
                      {organisationType === 'NPO'
                        ? 'Non-Profit Organisation participating in a DSAC-funded programme.'
                        : 'Public Entity participating in a DSAC-funded programme.'}
                    </Text>

                  </View>

                  <View
                    style={
                      isDesktop
                        ? styles.fieldHalf
                        : styles.fieldFull
                    }
                  >
                    <Text style={styles.label}>
                      REGISTRATION NUMBER *
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder={
                        organisationType === 'NPO'
                          ? 'e.g. NPO registration number'
                          : 'e.g. public entity registration/reference number'
                      }
                      placeholderTextColor="#888888"
                      value={registrationNumber}
                      onChangeText={setRegistrationNumber}
                      editable={!saving}
                    />
                  </View>

                  <View
                    style={
                      isDesktop
                        ? styles.fieldHalf
                        : styles.fieldFull
                    }
                  >
                    <Text style={styles.label}>
                      ORGANISATION EMAIL *
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="organisation@example.org"
                      placeholderTextColor="#888888"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!saving}
                    />
                  </View>

                </View>

              </View>

              {/* =================================================
                  FIRST ADMINISTRATOR
              ================================================= */}

              <View style={styles.formSection}>

                <View style={styles.sectionHeader}>
                  <View style={styles.sectionOrangeBar} />

                  <View>
                    <Text style={styles.sectionTitle}>
                      FIRST ORGANISATION ADMINISTRATOR
                    </Text>

                    <Text style={styles.sectionSubtitle}>
                      Initial user responsible for the organisation workspace
                    </Text>
                  </View>
                </View>

                <View style={styles.adminIntro}>
                  <View style={styles.adminIntroAccent} />

                  <Text style={styles.adminDescription}>
                    This user will receive access to the organisation
                    workspace and will manage the organisation's staff.
                  </Text>
                </View>

                <View style={styles.formGrid}>

                  <View
                    style={
                      isDesktop
                        ? styles.fieldHalf
                        : styles.fieldFull
                    }
                  >
                    <Text style={styles.label}>
                      ADMINISTRATOR FULL NAME *
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="Enter administrator full name"
                      placeholderTextColor="#888888"
                      value={adminFullName}
                      onChangeText={setAdminFullName}
                      editable={!saving}
                    />
                  </View>

                  <View
                    style={
                      isDesktop
                        ? styles.fieldHalf
                        : styles.fieldFull
                    }
                  >
                    <Text style={styles.label}>
                      ADMINISTRATOR EMAIL *
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="admin@example.org"
                      placeholderTextColor="#888888"
                      value={adminEmail}
                      onChangeText={setAdminEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!saving}
                    />
                  </View>

                  <View
                    style={
                      isDesktop
                        ? styles.fieldHalf
                        : styles.fieldFull
                    }
                  >
                    <Text style={styles.label}>
                      TEMPORARY PASSWORD *
                    </Text>

                    <View style={styles.passwordContainer}>

                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Minimum 8 characters"
                        placeholderTextColor="#888888"
                        value={adminPassword}
                        onChangeText={setAdminPassword}
                        secureTextEntry={
                          !adminPasswordVisible
                        }
                        autoCapitalize="none"
                        editable={!saving}
                      />

                      <Pressable
                        style={styles.passwordButton}
                        onPress={() =>
                          setAdminPasswordVisible(
                            !adminPasswordVisible
                          )
                        }
                        disabled={saving}
                      >
                        <Text style={styles.passwordButtonText}>
                          {adminPasswordVisible
                            ? 'HIDE'
                            : 'SHOW'}
                        </Text>
                      </Pressable>

                    </View>
                  </View>

                  <View
                    style={
                      isDesktop
                        ? styles.fieldHalf
                        : styles.fieldFull
                    }
                  >
                    <Text style={styles.label}>
                      CONFIRM TEMPORARY PASSWORD *
                    </Text>

                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter temporary password"
                      placeholderTextColor="#888888"
                      value={adminPasswordConfirm}
                      onChangeText={
                        setAdminPasswordConfirm
                      }
                      secureTextEntry={
                        !adminPasswordVisible
                      }
                      autoCapitalize="none"
                      editable={!saving}
                    />
                  </View>

                </View>

                {/* Security notice */}

                <View style={styles.securityNotice}>

                  <View style={styles.securityIcon}>
                    <Text style={styles.securityIconText}>
                      !
                    </Text>
                  </View>

                  <View style={styles.securityContent}>

                    <Text style={styles.securityNoticeTitle}>
                      SECURITY INFORMATION
                    </Text>

                    <Text style={styles.securityNoticeText}>
                      The password is sent directly to Supabase
                      Authentication through the secure server-side
                      provisioning function. It is not stored in the
                      CIVITRACK database.
                    </Text>

                  </View>

                </View>

              </View>

              {/* Form actions */}

              <View style={styles.formActions}>

                <Pressable
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.cancelPressed,
                  ]}
                  onPress={resetForm}
                  disabled={saving}
                >
                  <Text style={styles.cancelText}>
                    CANCEL
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.saveButton,
                    saving && styles.saveDisabled,
                  ]}
                  onPress={createOrganisation}
                  disabled={saving}
                >

                  {saving ? (
                    <>
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />

                      <Text style={styles.savingText}>
                        CREATING...
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.saveText}>
                      CREATE ORGANISATION
                    </Text>
                  )}

                </Pressable>

              </View>

            </View>
          )}

          {/* =================================================
              INFORMATION NOTICE
          ================================================= */}

          <View style={styles.infoCard}>

            <View style={styles.infoAccent} />

            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>
                i
              </Text>
            </View>

            <View style={styles.infoContent}>

              <Text style={styles.infoTitle}>
                ORGANISATION ACCESS
              </Text>

              <Text style={styles.infoText}>
                Organisations do not self-register. A DSAC
                administrator creates the organisation and
                provisions its first Organisation Administrator.
                The organisation may be an NPO or a Public Entity.
              </Text>

            </View>

          </View>

          {/* =================================================
              REGISTERED ORGANISATIONS
          ================================================= */}

          <View style={styles.sectionHeader}>

            <View style={styles.sectionOrangeBar} />

            <View>
              <Text style={styles.sectionTitle}>
                REGISTERED ORGANISATIONS
              </Text>

              <Text style={styles.sectionSubtitle}>
                Current organisations registered in CIVITRACK
              </Text>
            </View>

          </View>

          {loading ? (

            <View style={styles.loadingState}>

              <ActivityIndicator
                size="large"
                color="#009366"
              />

              <Text style={styles.loadingText}>
                Loading organisations...
              </Text>

            </View>

          ) : organisations.length === 0 ? (

            <View style={styles.emptyState}>

              <View style={styles.emptyIcon}>
                <Text style={styles.emptyIconText}>
                  +
                </Text>
              </View>

              <Text style={styles.emptyTitle}>
                NO ORGANISATIONS REGISTERED
              </Text>

              <Text style={styles.emptyText}>
                Create the first organisation to begin the
                CIVITRACK accountability workflow.
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.emptyButton,
                  pressed && styles.emptyButtonPressed,
                ]}
                onPress={() =>
                  setShowForm(true)
                }
              >
                <Text style={styles.emptyButtonText}>
                  + CREATE FIRST ORGANISATION
                </Text>
              </Pressable>

            </View>

          ) : (

            <View style={styles.organisationList}>

              {organisations.map(
                (organisation) => (

                  <View
                    key={organisation.id}
                    style={styles.organisationCard}
                  >

                    {/* Accent */}

                    <View
                      style={[
                        styles.organisationAccent,
                        organisation.status !== 'ACTIVE' &&
                          styles.organisationAccentInactive,
                      ]}
                    />

                    {/* Main row */}

                    <View
                      style={[
                        styles.organisationHeader,
                        !isDesktop &&
                          styles.organisationHeaderTablet,
                      ]}
                    >

                      <View
                        style={
                          styles.organisationHeaderContent
                        }
                      >

                        <Text
                          style={
                            styles.organisationName
                          }
                        >
                          {organisation.name}
                        </Text>

                        <Text
                          style={
                            styles.organisationRegistration
                          }
                        >
                          REGISTRATION: {
                            organisation.registration_number ||
                            '—'
                          }
                        </Text>

                      </View>

                      <View
                        style={[
                          styles.typeBadge,
                          organisation.organisation_type ===
                            'PUBLIC_ENTITY' &&
                            styles.publicEntityBadge,
                        ]}
                      >

                        <Text style={styles.typeBadgeText}>
                          {organisation.organisation_type ===
                          'PUBLIC_ENTITY'
                            ? 'PUBLIC ENTITY'
                            : 'NPO'}
                        </Text>

                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          organisation.status === 'ACTIVE' &&
                            styles.activeBadge,
                        ]}
                      >

                        <View
                          style={[
                            styles.statusDotSmall,
                            organisation.status !== 'ACTIVE' &&
                              styles.statusDotInactive,
                          ]}
                        />

                        <Text style={styles.statusText}>
                          {organisation.status || 'UNKNOWN'}
                        </Text>

                      </View>

                    </View>

                    {/* Details */}

                    <View
                      style={[
                        styles.organisationDetails,
                        !isDesktop &&
                          styles.organisationDetailsTablet,
                      ]}
                    >

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>
                          TYPE
                        </Text>

                        <Text style={styles.detailValue}>
                          {organisation.organisation_type ===
                          'PUBLIC_ENTITY'
                            ? 'Public Entity'
                            : 'NPO'}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>
                          EMAIL
                        </Text>

                        <Text
                          style={styles.detailValue}
                          numberOfLines={1}
                        >
                          {organisation.email || '—'}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>
                          PROVINCE
                        </Text>

                        <Text style={styles.detailValue}>
                          {organisation.province || '—'}
                        </Text>
                      </View>

                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>
                          REGISTERED
                        </Text>

                        <Text style={styles.detailValue}>
                          {formatDate(
                            organisation.created_at
                          )}
                        </Text>
                      </View>

                    </View>

                  </View>

                )
              )}

            </View>

          )}

        </View>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <View style={styles.footer}>

          <View style={styles.footerFlag}>
            <View style={styles.footerRed} />
            <View style={styles.footerGreen} />
            <View style={styles.footerBlue} />
            <View style={styles.footerGold} />
          </View>

          <View style={styles.footerContent}>

            <Text style={styles.footerTitle}>
              sport, arts & culture
            </Text>

            <Text style={styles.footerDepartment}>
              Department of Sport, Arts and Culture
            </Text>

            <Text style={styles.footerRepublic}>
              REPUBLIC OF SOUTH AFRICA
            </Text>

            <Text style={styles.footerSystem}>
              CIVITRACK — Public Funding &
              Accountability Management System
            </Text>

            <View style={styles.footerLine} />

            <Text style={styles.footerCopyright}>
              © 2026 Department of Sport, Arts and Culture
            </Text>

          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  /* =========================================================
     BASE
  ========================================================= */

  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  content: {
    flexGrow: 1,
  },

  /* =========================================================
     SOUTH AFRICAN FLAG STRIP
  ========================================================= */

  flagStrip: {
    height: 5,
    width: '100%',
    flexDirection: 'row',
  },

  flagSection: {
    flex: 1,
  },

  flagRed: {
    backgroundColor: '#F05D2A',
  },

  flagWhite: {
    backgroundColor: '#FFFFFF',
  },

  flagGreen: {
    flex: 2,
    backgroundColor: '#009366',
  },

  flagGold: {
    backgroundColor: '#F7941D',
  },

  flagBlue: {
    backgroundColor: '#0053A1',
  },

  flagBlack: {
    backgroundColor: '#000000',
  },

  /* =========================================================
     GOVERNMENT HEADER
  ========================================================= */

  topHeader: {
    backgroundColor: '#FFFFFF',
    minHeight: 150,
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },

  topHeaderTablet: {
    paddingHorizontal: 20,
    minHeight: 125,
  },

  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 330,
    flexShrink: 1,
  },

  coatContainer: {
    width: 92,
    height: 95,
    alignItems: 'center',
    justifyContent: 'center',
  },

  coatOfArms: {
    width: 84,
    height: 88,
  },

  brandText: {
    marginLeft: 5,
  },

  brandTitle: {
    color: '#F7941D',
    fontSize: 21,
    fontWeight: '500',
    letterSpacing: -0.5,
  },

  departmentText: {
    color: '#111111',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },

  republicText: {
    color: '#111111',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 1,
  },

  sloganArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  slogan: {
    color: '#F7941D',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  sloganLine: {
    width: 110,
    height: 2,
    backgroundColor: '#009366',
    marginTop: 8,
  },

  userArea: {
    alignItems: 'flex-end',
    minWidth: 150,
    paddingRight: 5,
  },

  userSmall: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  userRole: {
    color: '#009366',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
  },

  userEmail: {
    color: '#555555',
    fontSize: 9,
    marginTop: 3,
    maxWidth: 180,
  },

  dashboardButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F7941D',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  dashboardButtonPressed: {
    backgroundColor: '#FFF1E1',
  },

  dashboardButtonText: {
    color: '#F7941D',
    fontSize: 8,
    fontWeight: '900',
  },

  /* =========================================================
     CIVITRACK SYSTEM BAR
  ========================================================= */

  systemBar: {
    backgroundColor: '#FFFFFF',
    minHeight: 74,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#DDDDDD',
  },

  systemName: {
    color: '#222222',
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 2,
  },

  systemDescription: {
    color: '#777777',
    fontSize: 9,
    marginTop: 2,
  },

  systemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  flagMini: {
    width: 42,
    height: 25,
    marginRight: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },

  miniRed: {
    flex: 1,
    backgroundColor: '#F05D2A',
  },

  miniGreen: {
    flex: 1,
    backgroundColor: '#009366',
  },

  miniBlue: {
    flex: 1,
    backgroundColor: '#0053A1',
  },

  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#009366',
    paddingLeft: 10,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#009366',
    marginRight: 8,
  },

  statusLabel: {
    color: '#888888',
    fontSize: 7,
    fontWeight: '800',
  },

  statusValue: {
    color: '#009366',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },

  /* =========================================================
     NAVIGATION
  ========================================================= */

  navigation: {
    backgroundColor: '#F7941D',
    minHeight: 56,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'stretch',
    flexWrap: 'wrap',
  },

  navItem: {
    paddingHorizontal: 18,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },

  navActive: {
    paddingHorizontal: 18,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    borderTopColor: '#009366',
  },

  navText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  navActiveText: {
    color: '#222222',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /* =========================================================
     MAIN
  ========================================================= */

  main: {
    maxWidth: 1250,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 28,
  },

  mainTablet: {
    paddingHorizontal: 22,
  },

  /* =========================================================
     BREADCRUMB
  ========================================================= */

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  breadcrumbHome: {
    color: '#009366',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  breadcrumbSlash: {
    color: '#AAAAAA',
    fontSize: 9,
    marginHorizontal: 8,
  },

  breadcrumbCurrent: {
    color: '#777777',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* =========================================================
     PAGE HEADER
  ========================================================= */

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 32,
  },

  pageHeaderTablet: {
    flexWrap: 'wrap',
  },

  pageHeadingLeft: {
    flex: 1,
    paddingRight: 20,
  },

  orangeHeadingLine: {
    width: 42,
    height: 4,
    backgroundColor: '#F7941D',
    marginBottom: 10,
  },

  pageTitle: {
    color: '#222222',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  pageDescription: {
    color: '#666666',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    maxWidth: 650,
  },

  createButton: {
    backgroundColor: '#009366',
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
  },

  createButtonPressed: {
    backgroundColor: '#007A54',
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /* =========================================================
     SECTION HEADER
  ========================================================= */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 17,
  },

  sectionOrangeBar: {
    width: 4,
    height: 31,
    backgroundColor: '#F7941D',
    marginRight: 10,
  },

  sectionTitle: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  sectionSubtitle: {
    color: '#888888',
    fontSize: 10,
    marginTop: 3,
  },

  /* =========================================================
     FORM
  ========================================================= */

  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    marginBottom: 25,
    padding: 25,
  },

  formHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 20,
    marginBottom: 22,
  },

  formHeaderAccent: {
    width: 5,
    height: 50,
    backgroundColor: '#009366',
    marginRight: 12,
  },

  formTitle: {
    color: '#222222',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  formDescription: {
    color: '#777777',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
    maxWidth: 700,
  },

  formSection: {
    marginBottom: 25,
  },

  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  fieldFull: {
    width: '100%',
  },

  fieldHalf: {
    width: '48.5%',
  },

  label: {
    color: '#333333',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 14,
    marginBottom: 7,
  },

  input: {
    height: 46,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingHorizontal: 13,
    color: '#222222',
    fontSize: 13,
  },

  /* =========================================================
     ORGANISATION TYPE
  ========================================================= */

  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  typeButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  selectedType: {
    backgroundColor: '#009366',
    borderColor: '#009366',
  },

  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#AAAAAA',
    marginRight: 8,
  },

  typeIndicatorSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },

  typeText: {
    color: '#555555',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  selectedTypeText: {
    color: '#FFFFFF',
  },

  typeHint: {
    color: '#888888',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 7,
  },

  /* =========================================================
     ADMINISTRATOR
  ========================================================= */

  adminIntro: {
    flexDirection: 'row',
    marginBottom: 5,
  },

  adminIntroAccent: {
    width: 3,
    backgroundColor: '#0053A1',
    marginRight: 9,
  },

  adminDescription: {
    color: '#777777',
    fontSize: 11,
    lineHeight: 17,
    flex: 1,
  },

  passwordContainer: {
    height: 46,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
  },

  passwordInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 13,
    color: '#222222',
    fontSize: 13,
  },

  passwordButton: {
    height: 44,
    paddingHorizontal: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#DDDDDD',
  },

  passwordButtonText: {
    color: '#009366',
    fontSize: 9,
    fontWeight: '900',
  },

  /* =========================================================
     SECURITY NOTICE
  ========================================================= */

  securityNotice: {
    marginTop: 20,
    backgroundColor: '#F4F7FA',
    borderWidth: 1,
    borderColor: '#DCE3E8',
    borderLeftWidth: 4,
    borderLeftColor: '#009366',
    padding: 14,
    flexDirection: 'row',
  },

  securityIcon: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#009366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  securityIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  securityContent: {
    flex: 1,
  },

  securityNoticeTitle: {
    color: '#222222',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  securityNoticeText: {
    color: '#666666',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },

  /* =========================================================
     FORM ACTIONS
  ========================================================= */

  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 20,
    marginTop: 5,
    gap: 10,
  },

  cancelButton: {
    minHeight: 43,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelPressed: {
    backgroundColor: '#F5F5F5',
  },

  cancelText: {
    color: '#555555',
    fontSize: 9,
    fontWeight: '900',
  },

  saveButton: {
    minHeight: 43,
    minWidth: 190,
    backgroundColor: '#009366',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  saveDisabled: {
    opacity: 0.65,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  savingText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  /* =========================================================
     INFORMATION CARD
  ========================================================= */

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 17,
    marginBottom: 30,
    flexDirection: 'row',
  },

  infoAccent: {
    width: 4,
    backgroundColor: '#F7941D',
    marginRight: 13,
  },

  infoIcon: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#0053A1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: '#222222',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  infoText: {
    color: '#666666',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },

  /* =========================================================
     LOADING / EMPTY
  ========================================================= */

  loadingState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#777777',
    fontSize: 11,
    marginTop: 10,
  },

  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 35,
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#009366',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIconText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },

  emptyTitle: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 14,
    letterSpacing: 0.5,
  },

  emptyText: {
    color: '#777777',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    maxWidth: 500,
    marginTop: 6,
  },

  emptyButton: {
    marginTop: 18,
    backgroundColor: '#009366',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  emptyButtonPressed: {
    backgroundColor: '#007A54',
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },

  /* =========================================================
     ORGANISATION LIST
  ========================================================= */

  organisationList: {
    gap: 12,
  },

  organisationCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 20,
    overflow: 'hidden',
  },

  organisationAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#009366',
  },

  organisationAccentInactive: {
    backgroundColor: '#F7941D',
  },

  organisationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingLeft: 8,
  },

  organisationHeaderTablet: {
    flexWrap: 'wrap',
  },

  organisationHeaderContent: {
    flex: 1,
    minWidth: 220,
  },

  organisationName: {
    color: '#222222',
    fontSize: 15,
    fontWeight: '900',
  },

  organisationRegistration: {
    color: '#009366',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 5,
    letterSpacing: 0.3,
  },

  typeBadge: {
    backgroundColor: '#E8F3EE',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  publicEntityBadge: {
    backgroundColor: '#E8F0F7',
  },

  typeBadgeText: {
    color: '#009366',
    fontSize: 8,
    fontWeight: '900',
  },

  statusBadge: {
    backgroundColor: '#F3F3F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  activeBadge: {
    backgroundColor: '#EFF7F3',
  },

  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#009366',
    marginRight: 6,
  },

  statusDotInactive: {
    backgroundColor: '#F7941D',
  },

  statusText: {
    color: '#009366',
    fontSize: 8,
    fontWeight: '900',
  },

  organisationDetails: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 17,
    paddingTop: 14,
    paddingLeft: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },

  organisationDetailsTablet: {
    flexWrap: 'wrap',
  },

  detailItem: {
    flex: 1,
    minWidth: 130,
  },

  detailLabel: {
    color: '#888888',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  detailValue: {
    color: '#222222',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  /* =========================================================
     FOOTER
  ========================================================= */

  footer: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#DDDDDD',
  },

  footerFlag: {
    height: 5,
    flexDirection: 'row',
  },

  footerRed: {
    flex: 1,
    backgroundColor: '#F05D2A',
  },

  footerGreen: {
    flex: 2,
    backgroundColor: '#009366',
  },

  footerBlue: {
    flex: 1,
    backgroundColor: '#0053A1',
  },

  footerGold: {
    flex: 1,
    backgroundColor: '#F7941D',
  },

  footerContent: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },

  footerTitle: {
    color: '#F7941D',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  footerDepartment: {
    color: '#222222',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  footerRepublic: {
    color: '#222222',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
  },

  footerSystem: {
    color: '#777777',
    fontSize: 9,
    marginTop: 8,
    textAlign: 'center',
  },

  footerLine: {
    width: 100,
    height: 2,
    backgroundColor: '#009366',
    marginTop: 12,
  },

  footerCopyright: {
    color: '#999999',
    fontSize: 8,
    marginTop: 10,
  },

});
}
