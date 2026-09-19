import React, {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import ProtectedRoute from '../../src/components/ProtectedRoute';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { ROLES } from '../../src/constants/roles';

export default function CasesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const { user } = useAuth();

  // --------------------------------------------------
  // FORM STATE
  // --------------------------------------------------

  const [showForm, setShowForm] = useState(false);

  const [caseNumber, setCaseNumber] = useState('');
  const [description, setDescription] = useState('');

  const [organisations, setOrganisations] = useState([]);
  const [fundingAgreements, setFundingAgreements] = useState([]);
  const [cases, setCases] = useState([]);

  const [selectedOrganisation, setSelectedOrganisation] =
    useState(null);

  const [selectedFundingAgreement, setSelectedFundingAgreement] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showOrganisationList, setShowOrganisationList] =
    useState(false);

  const [showFundingList, setShowFundingList] =
    useState(false);

  // --------------------------------------------------
  // VALIDATION ERRORS
  // --------------------------------------------------

  const [errors, setErrors] = useState({
    caseNumber: '',
    organisation: '',
    fundingAgreement: '',
    description: '',
  });

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const [stats, setStats] = useState({
    DRAFT: 0,
    'IN PROGRESS': 0,
    'UNDER REVIEW': 0,
    'ACTION REQUIRED': 0,
    APPROVED: 0,
  });

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  const clearError = (field) => {
    setErrors((previous) => ({
      ...previous,
      [field]: '',
    }));
  };

  const normaliseCaseNumber = (value) => {
    return value
      .toUpperCase()
      .replace(/\s+/g, '');
  };

  const validateCaseNumberFormat = (value) => {
    /*
      Expected format:

      DSAC-CASE-2026-001

      DSAC-CASE-
      4 digit year
      -
      at least 3 digit case sequence
    */

    return /^DSAC-CASE-\d{4}-\d{3,}$/.test(value);
  };

  // --------------------------------------------------
  // INPUT HANDLERS
  // --------------------------------------------------

  const handleCaseNumberChange = (value) => {
    const formatted = normaliseCaseNumber(value);

    setCaseNumber(formatted);

    clearError('caseNumber');
  };

  const handleDescriptionChange = (value) => {
    setDescription(value);

    clearError('description');
  };

  // --------------------------------------------------
  // RESET FORM
  // --------------------------------------------------

  const resetForm = () => {
    setCaseNumber('');
    setDescription('');

    setSelectedOrganisation(null);
    setSelectedFundingAgreement(null);

    setShowOrganisationList(false);
    setShowFundingList(false);

    setErrors({
      caseNumber: '',
      organisation: '',
      fundingAgreement: '',
      description: '',
    });
  };

  // --------------------------------------------------
  // ORGANISATION SELECTION
  // --------------------------------------------------

  const selectOrganisation = (organisation) => {
    setSelectedOrganisation(organisation);

    // Changing organisation invalidates the
    // previous funding agreement.
    setSelectedFundingAgreement(null);

    setShowOrganisationList(false);
    setShowFundingList(false);

    clearError('organisation');
    clearError('fundingAgreement');
  };

  // --------------------------------------------------
  // FUNDING AGREEMENT SELECTION
  // --------------------------------------------------

  const selectFundingAgreement = (agreement) => {
    if (!selectedOrganisation) {
      setErrors((previous) => ({
        ...previous,
        fundingAgreement:
          'Please select an organisation first.',
      }));

      return;
    }

    // Extra safety check.
    if (
      agreement.organisation_id !==
      selectedOrganisation.id
    ) {
      setErrors((previous) => ({
        ...previous,
        fundingAgreement:
          'This funding agreement does not belong to the selected organisation.',
      }));

      return;
    }

    setSelectedFundingAgreement(agreement);

    setShowFundingList(false);

    clearError('fundingAgreement');
  };

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        organisationsResult,
        agreementsResult,
        casesResult,
      ] = await Promise.all([
        supabase
          .from('organisations')
          .select(
            'id, name, organisation_type, registration_number, status'
          )
          .order('name', {
            ascending: true,
          }),

        supabase
          .from('funding_agreements')
          .select(
            `
              id,
              organisation_id,
              agreement_number,
              title,
              allocated_amount,
              currency,
              status
            `
          )
          .order('created_at', {
            ascending: false,
          }),

        supabase
          .from('accountability_cases')
          .select(
            `
              id,
              case_number,
              title,
              description,
              status,
              priority,
              organisation_id,
              funding_agreement_id,
              due_date,
              created_at,
              organisations (
                id,
                name
              ),
              funding_agreements (
                id,
                agreement_number,
                title
              )
            `
          )
          .order('created_at', {
            ascending: false,
          }),
      ]);

      if (organisationsResult.error) {
        throw organisationsResult.error;
      }

      if (agreementsResult.error) {
        throw agreementsResult.error;
      }

      if (casesResult.error) {
        throw casesResult.error;
      }

      setOrganisations(
        organisationsResult.data || []
      );

      setFundingAgreements(
        agreementsResult.data || []
      );

      const loadedCases =
        casesResult.data || [];

      setCases(loadedCases);

      const calculatedStats = {
        DRAFT: 0,
        'IN PROGRESS': 0,
        'UNDER REVIEW': 0,
        'ACTION REQUIRED': 0,
        APPROVED: 0,
      };

      loadedCases.forEach((item) => {
        const status = item.status;

        if (
          Object.prototype.hasOwnProperty.call(
            calculatedStats,
            status
          )
        ) {
          calculatedStats[status] += 1;
        }
      });

      setStats(calculatedStats);
    } catch (error) {
      console.error(
        'Cases loading error:',
        error
      );

      Alert.alert(
        'Unable to Load Cases',
        error?.message ||
          'Something went wrong while loading accountability cases.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // LOAD WHEN SCREEN RECEIVES FOCUS
  // --------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const refresh = async () => {
    setRefreshing(true);

    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  // --------------------------------------------------
  // FORM VALIDATION
  // --------------------------------------------------

  const validateForm = async () => {
    const newErrors = {
      caseNumber: '',
      organisation: '',
      fundingAgreement: '',
      description: '',
    };

    let valid = true;

    const cleanedCaseNumber =
      normaliseCaseNumber(
        caseNumber.trim()
      );

    const cleanedDescription =
      description.trim();

    // ----------------------------------------------
    // CASE NUMBER
    // ----------------------------------------------

    if (!cleanedCaseNumber) {
      newErrors.caseNumber =
        'Case number is required.';

      valid = false;
    } else if (
      !validateCaseNumberFormat(
        cleanedCaseNumber
      )
    ) {
      newErrors.caseNumber =
        'Use the format DSAC-CASE-2026-001.';

      valid = false;
    } else {
      // Check for duplicate case number.
      const { data, error } = await supabase
        .from('accountability_cases')
        .select('id')
        .eq(
          'case_number',
          cleanedCaseNumber
        )
        .limit(1);

      if (error) {
        console.error(
          'Duplicate case check error:',
          error
        );

        newErrors.caseNumber =
          'The case number could not be verified.';

        valid = false;
      } else if (
        data &&
        data.length > 0
      ) {
        newErrors.caseNumber =
          'This case number already exists.';

        valid = false;
      }
    }

    // ----------------------------------------------
    // ORGANISATION
    // ----------------------------------------------

    if (!selectedOrganisation) {
      newErrors.organisation =
        'Please select an organisation.';

      valid = false;
    }

    // ----------------------------------------------
    // FUNDING AGREEMENT
    // ----------------------------------------------

    if (!selectedFundingAgreement) {
      newErrors.fundingAgreement =
        'Please select a funding agreement.';

      valid = false;
    } else if (
      selectedOrganisation &&
      selectedFundingAgreement.organisation_id !==
        selectedOrganisation.id
    ) {
      newErrors.fundingAgreement =
        'The selected funding agreement does not belong to the selected organisation.';

      valid = false;
    }

    // ----------------------------------------------
    // DESCRIPTION
    // ----------------------------------------------

    if (!cleanedDescription) {
      newErrors.description =
        'Case description is required.';

      valid = false;
    } else if (
      cleanedDescription.length < 20
    ) {
      newErrors.description =
        'Case description must contain at least 20 characters.';

      valid = false;
    } else if (
      cleanedDescription.length > 2000
    ) {
      newErrors.description =
        'Case description cannot exceed 2000 characters.';

      valid = false;
    }

    setErrors(newErrors);

    return valid;
  };

  // --------------------------------------------------
  // CREATE CASE
  // --------------------------------------------------

  const createCase = async () => {
    if (!user?.id) {
      Alert.alert(
        'Authentication Error',
        'Your account could not be identified. Please sign in again.'
      );

      return;
    }

    const valid = await validateForm();

    if (!valid) {
      Alert.alert(
        'Please Check Your Information',
        'Some fields contain missing or invalid information. Please correct the highlighted fields.'
      );

      return;
    }

    if (
      !selectedOrganisation ||
      !selectedFundingAgreement
    ) {
      return;
    }

    try {
      setSaving(true);

      const cleanedCaseNumber =
        normaliseCaseNumber(
          caseNumber.trim()
        );

      const cleanedDescription =
        description.trim();

      // Final relationship check before
      // database insert.
      if (
        selectedFundingAgreement.organisation_id !==
        selectedOrganisation.id
      ) {
        setErrors((previous) => ({
          ...previous,
          fundingAgreement:
            'The selected funding agreement does not belong to the selected organisation.',
        }));

        return;
      }

      const { error } = await supabase
        .from('accountability_cases')
        .insert({
          case_number:
            cleanedCaseNumber,

          title:
            cleanedCaseNumber,

          description:
            cleanedDescription,

          organisation_id:
            selectedOrganisation.id,

          funding_agreement_id:
            selectedFundingAgreement.id,

          status: 'DRAFT',

          priority: 'MEDIUM',

          created_by: user.id,

          responsible_user_id: null,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Accountability Case Created',
        `Case ${cleanedCaseNumber} has been created successfully.`
      );

      resetForm();

      setShowForm(false);

      await loadData();
    } catch (error) {
      console.error(
        'Create case error:',
        error
      );

      // Handle duplicate constraint.
      if (
        error?.code === '23505'
      ) {
        setErrors((previous) => ({
          ...previous,
          caseNumber:
            'This case number already exists. Please use a different case number.',
        }));

        Alert.alert(
          'Duplicate Case Number',
          'A case with this case number already exists.'
        );
      } else {
        Alert.alert(
          'Unable to Create Case',
          error?.message ||
            'The accountability case could not be created.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // CANCEL FORM
  // --------------------------------------------------

  const cancelForm = () => {
    if (saving) {
      return;
    }

    resetForm();

    setShowForm(false);
  };

  // --------------------------------------------------
  // FILTER FUNDING AGREEMENTS
  // --------------------------------------------------

  const filteredFundingAgreements =
    selectedOrganisation
      ? fundingAgreements.filter(
          (agreement) =>
            agreement.organisation_id ===
            selectedOrganisation.id
        )
      : [];

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <ProtectedRoute
      allowedRoles={[
        ROLES.DSAC_ADMIN,
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#D97706"
              colors={['#D97706']}
            />
          }
        >
          {/* SOUTH AFRICAN FLAG STRIP */}

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

          {/* GOVERNMENT HEADER */}

          <View
            style={[
              styles.topHeader,
              isDesktop &&
                styles.topHeaderTablet,
            ]}
          >
            <View style={styles.brandArea}>
              <View style={styles.coatContainer}>
                <Text style={styles.coatPlaceholder}>
                  SA
                </Text>
              </View>

              <View style={styles.brandText}>
                <Text style={styles.brandTitle}>
                  REPUBLIC OF SOUTH AFRICA
                </Text>

                <Text style={styles.departmentText}>
                  DEPARTMENT OF SPORT, ARTS AND CULTURE
                </Text>

                <Text style={styles.republicText}>
                  GOVERNMENT OF SOUTH AFRICA
                </Text>
              </View>
            </View>

            <View style={styles.sloganArea}>
              <Text style={styles.slogan}>
                Inspiring a Nation through Sport, Arts and Culture
              </Text>

              <View style={styles.sloganLine} />
            </View>

            <View style={styles.userArea}>
              <Text style={styles.userSmall}>
                SIGNED IN AS
              </Text>

              <Text style={styles.userRole}>
                DSAC ADMIN
              </Text>

              <Text
                style={styles.userEmail}
                numberOfLines={1}
              >
                {user?.email || 'Administrator'}
              </Text>

              <Pressable
                style={({ pressed }) => [
                  styles.dashboardButton,
                  pressed &&
                    styles.dashboardButtonPressed,
                ]}
                onPress={() =>
                  router.replace(
                    '/dsac/dashboard'
                  )
                }
              >
                <Text
                  style={
                    styles.dashboardButtonText
                  }
                >
                  DASHBOARD
                </Text>
              </Pressable>
            </View>
          </View>

          {/* CIVITRACK SYSTEM BAR */}

          <View style={styles.systemBar}>
            <View>
              <Text style={styles.systemName}>
                CIVITRACK
              </Text>

              <Text style={styles.systemDescription}>
                DIGITAL GOVERNMENT ACCOUNTABILITY PLATFORM
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

                <Text style={styles.statusLabel}>
                  SYSTEM STATUS
                </Text>

                <Text style={styles.statusValue}>
                  OPERATIONAL
                </Text>
              </View>
            </View>
          </View>

          {/* NAVIGATION */}

          <View style={styles.navigation}>
            <Pressable
              style={styles.navItem}
              onPress={() =>
                router.replace(
                  '/dsac/dashboard'
                )
              }
            >
              <Text style={styles.navText}>
                HOME
              </Text>
            </Pressable>

            <Pressable
              style={styles.navItem}
              onPress={() =>
                router.replace(
                  '/dsac/funding-agreements'
                )
              }
            >
              <Text style={styles.navText}>
                FUNDING
              </Text>
            </Pressable>

            <View
              style={[
                styles.navItem,
                styles.navActive,
              ]}
            >
              <Text
                style={
                  styles.navActiveText
                }
              >
                ACCOUNTABILITY
              </Text>

              <Text style={styles.subtitle}>
                DSAC Accountability Cases
              </Text>
            </View>

            <Pressable
              style={styles.navItem}
              onPress={() =>
                router.replace(
                  '/dsac/organisations'
                )
              }
            >
              <Text style={styles.navText}>
                ORGANISATIONS
              </Text>
            </Pressable>
          </View>

          {/* MAIN */}

          <View
            style={[
              styles.main,
              isDesktop &&
                styles.mainTablet,
            ]}
          >
            {/* BREADCRUMB */}

            <View style={styles.breadcrumb}>
              <Pressable
                onPress={() =>
                  router.replace(
                    '/dsac/dashboard'
                  )
                }
              >
                <Text
                  style={
                    styles.breadcrumbHome
                  }
                >
                  HOME
                </Text>
              </Pressable>

              <Text
                style={
                  styles.breadcrumbSlash
                }
              >
                /
              </Text>

              <Text
                style={
                  styles.breadcrumbCurrent
                }
              >
                ACCOUNTABILITY
              </Text>
            </View>

            {/* PAGE HEADER */}

            <View
              style={[
                styles.pageHeader,
                isDesktop &&
                  styles.pageHeaderTablet,
              ]}
            >
              <View
                style={
                  styles.pageHeadingLeft
                }
              >
                <View
                  style={
                    styles.orangeHeadingLine
                  }
                />

                <Text style={styles.pageTitle}>
                  ACCOUNTABILITY CASES
                </Text>

                <Text
                  style={
                    styles.pageDescription
                  }
                >
                  Create, monitor and manage
                  accountability cases linked to
                  organisations and funding agreements.
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.createButton,
                  pressed &&
                    styles.createButtonPressed,
                ]}
                onPress={() =>
                  setShowForm(!showForm)
                }
              >
                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  {showForm
                    ? '− CLOSE FORM'
                    : '+ CREATE CASE'}
                </Text>
              </Pressable>
            </View>

            {/* CREATE CASE FORM */}

            {showForm && (
              <>
                <View
                  style={
                    styles.sectionHeader
                  }
                >
                  <View
                    style={
                      styles.sectionOrangeBar
                    }
                  />

                  <View>
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      CREATE ACCOUNTABILITY CASE
                    </Text>

                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Create a case and link it to the
                      relevant organisation and funding agreement.
                    </Text>
                  </View>
                </View>

                <View style={styles.formCard}>
                  <View
                    style={styles.formHeader}
                  >
                    <View
                      style={
                        styles.formHeaderAccent
                      }
                    />

                    <Text
                      style={
                        styles.formTitle
                      }
                    >
                      CASE DETAILS
                    </Text>

                    <Text
                      style={
                        styles.formDescription
                      }
                    >
                      A case becomes the main accountability
                      workspace for an organisation.
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.formGrid,
                      isDesktop && {
                        flexDirection:
                          'row',
                        flexWrap:
                          'wrap',
                      },
                    ]}
                  >
                    {/* CASE NUMBER */}

                    <View
                      style={[
                        styles.fieldFull,
                        isDesktop &&
                          styles.fieldHalf,
                      ]}
                    >
                      <Text
                        style={
                          styles.label
                        }
                      >
                        CASE NUMBER *
                      </Text>

                      <TextInput
                        style={[
                          styles.input,
                          errors.caseNumber &&
                            styles.inputError,
                        ]}
                        placeholder="e.g. DSAC-CASE-2026-001"
                        placeholderTextColor="#9CA3AF"
                        value={
                          caseNumber
                        }
                        onChangeText={
                          handleCaseNumberChange
                        }
                        autoCapitalize="characters"
                        autoCorrect={false}
                        maxLength={30}
                      />

                      {errors.caseNumber ? (
                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {errors.caseNumber}
                        </Text>
                      ) : (
                        <Text
                          style={
                            styles.helperText
                          }
                        >
                          Format: DSAC-CASE-YYYY-001
                        </Text>
                      )}
                    </View>

                    {/* ORGANISATION */}

                    <View
                      style={[
                        styles.fieldFull,
                        isDesktop &&
                          styles.fieldHalf,
                      ]}
                    >
                      <Text
                        style={
                          styles.label
                        }
                      >
                        ORGANISATION *
                      </Text>

                      <Pressable
                        style={[
                          styles.selectInput,
                          showOrganisationList &&
                            styles.selectInputActive,
                          errors.organisation &&
                            styles.inputError,
                        ]}
                        onPress={() =>
                          setShowOrganisationList(
                            !showOrganisationList
                          )
                        }
                      >
                        <Text
                          style={
                            selectedOrganisation
                              ? styles.selectText
                              : styles.placeholderText
                          }
                        >
                          {selectedOrganisation
                            ? selectedOrganisation.name
                            : 'Select organisation'}
                        </Text>

                        <Text
                          style={
                            styles.selectArrow
                          }
                        >
                          {showOrganisationList
                            ? '▲'
                            : '▼'}
                        </Text>
                      </Pressable>

                      {errors.organisation && (
                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {errors.organisation}
                        </Text>
                      )}

                      {showOrganisationList && (
                        <View
                          style={
                            styles.dropdown
                          }
                        >
                          {organisations.length ===
                          0 ? (
                            <Text
                              style={
                                styles.dropdownEmpty
                              }
                            >
                              No organisations available.
                            </Text>
                          ) : (
                            organisations.map(
                              (
                                organisation
                              ) => (
                                <Pressable
                                  key={
                                    organisation.id
                                  }
                                  style={
                                    styles.dropdownItem
                                  }
                                  onPress={() =>
                                    selectOrganisation(
                                      organisation
                                    )
                                  }
                                >
                                  <Text
                                    style={
                                      styles.dropdownItemTitle
                                    }
                                  >
                                    {
                                      organisation.name
                                    }
                                  </Text>

                                  <Text
                                    style={
                                      styles.dropdownItemSubtitle
                                    }
                                  >
                                    {
                                      organisation.organisation_type
                                    }

                                    {organisation.registration_number
                                      ? ` • ${organisation.registration_number}`
                                      : ''}
                                  </Text>
                                </Pressable>
                              )
                            )
                          )}
                        </View>
                      )}
                    </View>

                    {/* FUNDING AGREEMENT */}

                    <View
                      style={[
                        styles.fieldFull,
                        isDesktop &&
                          styles.fieldHalf,
                      ]}
                    >
                      <Text
                        style={
                          styles.label
                        }
                      >
                        FUNDING AGREEMENT *
                      </Text>

                      <Pressable
                        style={[
                          styles.selectInput,
                          !selectedOrganisation &&
                            styles.disabledInput,
                          showFundingList &&
                            styles.selectInputActive,
                          errors.fundingAgreement &&
                            styles.inputError,
                        ]}
                        disabled={
                          !selectedOrganisation
                        }
                        onPress={() =>
                          setShowFundingList(
                            !showFundingList
                          )
                        }
                      >
                        <Text
                          style={
                            selectedFundingAgreement
                              ? styles.selectText
                              : styles.placeholderText
                          }
                          numberOfLines={2}
                        >
                          {selectedFundingAgreement
                            ? `${selectedFundingAgreement.agreement_number} — ${selectedFundingAgreement.title || 'Funding Agreement'}`
                            : selectedOrganisation
                            ? 'Select funding agreement'
                            : 'Select an organisation first'}
                        </Text>

                        <Text
                          style={
                            styles.selectArrow
                          }
                        >
                          {selectedOrganisation
                            ? showFundingList
                              ? '▲'
                              : '▼'
                            : ''}
                        </Text>
                      </Pressable>

                      {errors.fundingAgreement && (
                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {
                            errors.fundingAgreement
                          }
                        </Text>
                      )}

                      {showFundingList &&
                        selectedOrganisation && (
                          <View
                            style={
                              styles.dropdown
                            }
                          >
                            {filteredFundingAgreements.length ===
                            0 ? (
                              <Text
                                style={
                                  styles.dropdownEmpty
                                }
                              >
                                No funding agreements found
                                for this organisation.
                              </Text>
                            ) : (
                              filteredFundingAgreements.map(
                                (
                                  agreement
                                ) => (
                                  <Pressable
                                    key={
                                      agreement.id
                                    }
                                    style={
                                      styles.dropdownItem
                                    }
                                    onPress={() =>
                                      selectFundingAgreement(
                                        agreement
                                      )
                                    }
                                  >
                                    <Text
                                      style={
                                        styles.dropdownItemTitle
                                      }
                                    >
                                      {
                                        agreement.agreement_number
                                      }
                                    </Text>

                                    <Text
                                      style={
                                        styles.dropdownItemSubtitle
                                      }
                                    >
                                      {agreement.title ||
                                        'Funding Agreement'}

                                      {agreement.allocated_amount !==
                                      null
                                        ? ` • ${
                                            agreement.currency ||
                                            'ZAR'
                                          } ${Number(
                                            agreement.allocated_amount
                                          ).toLocaleString(
                                            'en-ZA'
                                          )}`
                                        : ''}
                                    </Text>
                                  </Pressable>
                                )
                              )
                            )}
                          </View>
                        )}
                    </View>

                    {/* DESCRIPTION */}

                    <View
                      style={
                        styles.fieldFull
                      }
                    >
                      <Text
                        style={
                          styles.label
                        }
                      >
                        CASE DESCRIPTION *
                      </Text>

                      <TextInput
                        style={[
                          styles.input,
                          styles.textArea,
                          errors.description &&
                            styles.inputError,
                        ]}
                        placeholder="Describe the accountability requirements..."
                        placeholderTextColor="#9CA3AF"
                        value={
                          description
                        }
                        onChangeText={
                          handleDescriptionChange
                        }
                        multiline
                        textAlignVertical="top"
                        maxLength={2000}
                      />

                      <View
                        style={
                          styles.descriptionFooter
                        }
                      >
                        {errors.description ? (
                          <Text
                            style={
                              styles.errorText
                            }
                          >
                            {
                              errors.description
                            }
                          </Text>
                        ) : (
                          <Text
                            style={
                              styles.helperText
                            }
                          >
                            Minimum 20 characters.
                          </Text>
                        )}

                        <Text
                          style={
                            styles.characterCount
                          }
                        >
                          {description.length}/2000
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* WORKFLOW NOTICE */}

                  <View
                    style={
                      styles.workflowNotice
                    }
                  >
                    <View
                      style={
                        styles.workflowNoticeAccent
                      }
                    />

                    <View
                      style={
                        styles.workflowNoticeContent
                      }
                    >
                      <Text
                        style={
                          styles.workflowNoticeTitle
                        }
                      >
                        ACCOUNTABILITY WORKFLOW
                      </Text>

                      <Text
                        style={
                          styles.workflowNoticeText
                        }
                      >
                        Organisation → Funding Agreement →
                        Accountability Case
                      </Text>

                      <Text
                        style={
                          styles.workflowNoticeDescription
                        }
                      >
                        The selected funding agreement must belong
                        to the selected organisation.
                      </Text>
                    </View>
                  </View>

                  {/* ACTIONS */}

                  <View
                    style={
                      styles.formActions
                    }
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.cancelButton,
                        pressed &&
                          styles.cancelPressed,
                      ]}
                      onPress={
                        cancelForm
                      }
                      disabled={saving}
                    >
                      <Text
                        style={
                          styles.cancelText
                        }
                      >
                        CANCEL
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.saveButton,
                        saving &&
                          styles.saveDisabled,
                        pressed &&
                          !saving && {
                            opacity: 0.85,
                          },
                      ]}
                      onPress={
                        createCase
                      }
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                          />

                          <Text
                            style={
                              styles.savingText
                            }
                          >
                            CREATING...
                          </Text>
                        </>
                      ) : (
                        <Text
                          style={
                            styles.saveText
                          }
                        >
                          CREATE CASE
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            {/* INFORMATION CARD */}

            <View style={styles.infoCard}>
              <View style={styles.infoAccent} />

              <View style={styles.infoIcon}>
                <Text
                  style={
                    styles.infoIconText
                  }
                >
                  i
                </Text>
              </View>

              <View
                style={
                  styles.infoContent
                }
              >
                <Text
                  style={
                    styles.infoTitle
                  }
                >
                  ACCOUNTABILITY MANAGEMENT
                </Text>

                <Text
                  style={
                    styles.infoText
                  }
                >
                  Accountability cases provide a structured
                  workspace for monitoring compliance, actions
                  and accountability requirements associated
                  with DSAC funding agreements.
                </Text>

                {/* SECONDARY CASE NUMBER */}

                <Text style={styles.label}>
                  CASE NUMBER *
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    errors.caseNumber &&
                      styles.inputError,
                  ]}
                  placeholder="e.g. DSAC-CASE-2026-001"
                  placeholderTextColor="#888888"
                  value={caseNumber}
                  onChangeText={
                    handleCaseNumberChange
                  }
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={30}
                />

                {errors.caseNumber ? (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {errors.caseNumber}
                  </Text>
                ) : (
                  <Text
                    style={
                      styles.helperText
                    }
                  >
                    Format: DSAC-CASE-YYYY-001
                  </Text>
                )}

                {/* SECONDARY ORGANISATION */}

                <Text style={styles.label}>
                  ORGANISATION *
                </Text>

                <Pressable
                  style={[
                    styles.selectInput,
                    showOrganisationList &&
                      styles.selectInputActive,
                    errors.organisation &&
                      styles.inputError,
                  ]}
                  onPress={() =>
                    setShowOrganisationList(
                      !showOrganisationList
                    )
                  }
                >
                  <Text
                    style={
                      selectedOrganisation
                        ? styles.selectText
                        : styles.placeholderText
                    }
                  >
                    {selectedOrganisation
                      ? selectedOrganisation.name
                      : 'Select organisation'}
                  </Text>

                  <Text
                    style={
                      styles.selectArrow
                    }
                  >
                    {showOrganisationList
                      ? '▲'
                      : '▼'}
                  </Text>
                </Pressable>

                {errors.organisation && (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {errors.organisation}
                  </Text>
                )}

                {showOrganisationList && (
                  <View
                    style={
                      styles.dropdown
                    }
                  >
                    {organisations.length ===
                    0 ? (
                      <Text
                        style={
                          styles.dropdownEmpty
                        }
                      >
                        No organisations available.
                      </Text>
                    ) : (
                      organisations.map(
                        (
                          organisation
                        ) => (
                          <Pressable
                            key={
                              organisation.id
                            }
                            style={
                              styles.dropdownItem
                            }
                            onPress={() =>
                              selectOrganisation(
                                organisation
                              )
                            }
                          >
                            <Text
                              style={
                                styles.dropdownItemTitle
                              }
                            >
                              {
                                organisation.name
                              }
                            </Text>

                            <Text
                              style={
                                styles.dropdownItemSubtitle
                              }
                            >
                              {
                                organisation.organisation_type
                              }

                              {organisation.registration_number
                                ? ` • ${organisation.registration_number}`
                                : ''}
                            </Text>
                          </Pressable>
                        )
                      )
                    )}
                  </View>
                )}

                {/* SECONDARY FUNDING AGREEMENT */}

                <Text style={styles.label}>
                  FUNDING AGREEMENT *
                </Text>

                <Pressable
                  style={[
                    styles.selectInput,
                    !selectedOrganisation &&
                      styles.disabledInput,
                    errors.fundingAgreement &&
                      styles.inputError,
                  ]}
                  disabled={
                    !selectedOrganisation
                  }
                  onPress={() =>
                    setShowFundingList(
                      !showFundingList
                    )
                  }
                >
                  <Text
                    style={
                      selectedFundingAgreement
                        ? styles.selectText
                        : styles.placeholderText
                    }
                  >
                    {selectedFundingAgreement
                      ? `${selectedFundingAgreement.agreement_number} — ${selectedFundingAgreement.title || 'Funding Agreement'}`
                      : selectedOrganisation
                      ? 'Select funding agreement'
                      : 'Select an organisation first'}
                  </Text>

                  <Text
                    style={
                      styles.selectArrow
                    }
                  >
                    {selectedOrganisation
                      ? showFundingList
                        ? '▲'
                        : '▼'
                      : ''}
                  </Text>
                </Pressable>

                {errors.fundingAgreement && (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {
                      errors.fundingAgreement
                    }
                  </Text>
                )}

                {showFundingList &&
                  selectedOrganisation && (
                    <View
                      style={
                        styles.dropdown
                      }
                    >
                      {filteredFundingAgreements.length ===
                      0 ? (
                        <Text
                          style={
                            styles.dropdownEmpty
                          }
                        >
                          No funding agreements found
                          for this organisation.
                        </Text>
                      ) : (
                        filteredFundingAgreements.map(
                          (
                            agreement
                          ) => (
                            <Pressable
                              key={
                                agreement.id
                              }
                              style={
                                styles.dropdownItem
                              }
                              onPress={() =>
                                selectFundingAgreement(
                                  agreement
                                )
                              }
                            >
                              <Text
                                style={
                                  styles.dropdownItemTitle
                                }
                              >
                                {
                                  agreement.agreement_number
                                }
                              </Text>

                              <Text
                                style={
                                  styles.dropdownItemSubtitle
                                }
                              >
                                {agreement.title ||
                                  'Funding Agreement'}

                                {agreement.allocated_amount !==
                                null
                                  ? ` • ${
                                      agreement.currency ||
                                      'ZAR'
                                    } ${Number(
                                      agreement.allocated_amount
                                    ).toLocaleString(
                                      'en-ZA'
                                    )}`
                                  : ''}
                              </Text>
                            </Pressable>
                          )
                        )
                      )}
                    </View>
                  )}

                {/* SECONDARY DESCRIPTION */}

                <Text style={styles.label}>
                  CASE DESCRIPTION *
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    errors.description &&
                      styles.inputError,
                  ]}
                  placeholder="Describe the accountability requirements..."
                  placeholderTextColor="#888888"
                  value={description}
                  onChangeText={
                    handleDescriptionChange
                  }
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                />

                <View
                  style={
                    styles.descriptionFooter
                  }
                >
                  {errors.description ? (
                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {errors.description}
                    </Text>
                  ) : (
                    <Text
                      style={
                        styles.helperText
                      }
                    >
                      Minimum 20 characters.
                    </Text>
                  )}

                  <Text
                    style={
                      styles.characterCount
                    }
                  >
                    {description.length}/2000
                  </Text>
                </View>

                {/* ACTION BUTTONS */}

                <View style={styles.actions}>
                  <Pressable
                    style={styles.cancel}
                    onPress={cancelForm}
                    disabled={saving}
                  >
                    <Text
                      style={
                        styles.cancelText
                      }
                    >
                      CANCEL
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.save,
                      saving &&
                        styles.saveDisabled,
                    ]}
                    onPress={
                      createCase
                    }
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.saveText
                        }
                      >
                        CREATE CASE
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>

            {/* STATISTICS */}

            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionOrangeBar
                }
              />

              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  CASE STATUS OVERVIEW
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Current accountability case status across CIVITRACK.
                </Text>
              </View>
            </View>

            {/* LOADING */}

            {loading ? (
              <View
                style={
                  styles.loadingState
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#D97706"
                />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Loading accountability cases...
                </Text>
              </View>
            ) : (
              <>
                {/* STATUS CARDS */}

                <View
                  style={[
                    styles.statusGrid,
                    isDesktop &&
                      styles.statusGridDesktop,
                  ]}
                >
                  <StatusCard
                    label="DRAFT"
                    number={
                      stats.DRAFT
                    }
                    accent="#777777"
                  />

                  <StatusCard
                    label="IN PROGRESS"
                    number={
                      stats[
                        'IN PROGRESS'
                      ]
                    }
                    accent="#007A4D"
                  />

                  <StatusCard
                    label="UNDER REVIEW"
                    number={
                      stats[
                        'UNDER REVIEW'
                      ]
                    }
                    accent="#003DA5"
                  />

                  <StatusCard
                    label="ACTION REQUIRED"
                    number={
                      stats[
                        'ACTION REQUIRED'
                      ]
                    }
                    accent="#D97706"
                  />

                  <StatusCard
                    label="APPROVED"
                    number={
                      stats.APPROVED
                    }
                    accent="#007A4D"
                  />
                </View>

                {/* CASE LIST */}

                <View
                  style={
                    styles.sectionHeader
                  }
                >
                  <View
                    style={
                      styles.sectionOrangeBar
                    }
                  />

                  <View>
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      ACCOUNTABILITY CASES
                    </Text>

                    <Text
                      style={
                        styles.sectionSubtitle
                      }
                    >
                      Select a case to view its full accountability workspace.
                    </Text>
                  </View>
                </View>

                {cases.length === 0 ? (
                  <View
                    style={
                      styles.emptyState
                    }
                  >
                    <View
                      style={
                        styles.emptyIcon
                      }
                    >
                      <Text
                        style={
                          styles.emptyIconText
                        }
                      >
                        C
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.emptyTitle
                      }
                    >
                      NO ACCOUNTABILITY CASES
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Create a case after an organisation
                      and funding agreement have been established.
                    </Text>

                    <View
                      style={
                        styles.workflow
                      }
                    >
                      <Text
                        style={
                          styles.workflowText
                        }
                      >
                        Organisation
                      </Text>

                      <Text
                        style={
                          styles.workflowArrow
                        }
                      >
                        →
                      </Text>

                      <Text
                        style={
                          styles.workflowText
                        }
                      >
                        Funding Agreement
                      </Text>

                      <Text
                        style={
                          styles.workflowArrow
                        }
                      >
                        →
                      </Text>

                      <Text
                        style={
                          styles.workflowText
                        }
                      >
                        Accountability Case
                      </Text>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.emptyButton,
                        pressed &&
                          styles.emptyButtonPressed,
                      ]}
                      onPress={() =>
                        setShowForm(true)
                      }
                    >
                      <Text
                        style={
                          styles.emptyButtonText
                        }
                      >
                        CREATE FIRST CASE
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View
                    style={
                      styles.caseList
                    }
                  >
                    {cases.map(
                      (item) => (
                        <CaseCard
                          key={
                            item.id
                          }
                          item={
                            item
                          }
                        />
                      )
                    )}
                  </View>
                )}
              </>
            )}
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <View
              style={
                styles.footerFlag
              }
            >
              <View
                style={
                  styles.footerRed
                }
              />

              <View
                style={
                  styles.footerGreen
                }
              />

              <View
                style={
                  styles.footerBlue
                }
              />

              <View
                style={
                  styles.footerGold
                }
              />
            </View>

            <View
              style={
                styles.footerContent
              }
            >
              <Text
                style={
                  styles.footerTitle
                }
              >
                REPUBLIC OF SOUTH AFRICA
              </Text>

              <Text
                style={
                  styles.footerDepartment
                }
              >
                DEPARTMENT OF SPORT, ARTS AND CULTURE
              </Text>

              <Text
                style={
                  styles.footerRepublic
                }
              >
                Digital Government Accountability Platform
              </Text>

              <View
                style={
                  styles.footerLine
                }
              />

              <Text
                style={
                  styles.footerSystem
                }
              >
                CIVITRACK • ACCOUNTABILITY MANAGEMENT
              </Text>

              <Text
                style={
                  styles.footerCopyright
                }
              >
                © {new Date().getFullYear()} Government of South Africa
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ProtectedRoute>
  );
}

// --------------------------------------------------
// STATUS CARD
// --------------------------------------------------

function StatusCard({
  label,
  number,
  accent,
}) {
  return (
    <View
      style={[
        styles.statusCard,
        {
          borderTopColor:
            accent,
        },
      ]}
    >
      <Text
        style={
          styles.statusLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.statusNumber
        }
      >
        {number}
      </Text>
    </View>
  );
}

// --------------------------------------------------
// CASE CARD
// --------------------------------------------------

function CaseCard({ item }) {
  const organisationName =
    item.organisations?.name ||
    'Organisation';

  const agreementNumber =
    item.funding_agreements
      ?.agreement_number ||
    'Funding Agreement';

  const statusStyle =
    getStatusStyle(
      item.status
    );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.caseCard,
        pressed &&
          styles.caseCardPressed,
      ]}
      onPress={() =>
        router.push(
          `/cases/${item.id}`
        )
      }
    >
      <View
        style={[
          styles.caseCardAccent,
          statusStyle.accent,
        ]}
      />

      <View
        style={
          styles.caseCardInner
        }
      >
        <View
          style={
            styles.caseCardHeader
          }
        >
          <View
            style={
              styles.caseCardHeading
            }
          >
            <Text
              style={
                styles.caseNumber
              }
            >
              {item.case_number}
            </Text>

            <Text
              style={
                styles.caseTitle
              }
            >
              {item.title ||
                'Accountability Case'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  statusStyle.backgroundColor,
              },
            ]}
          >
            <View
              style={[
                styles.statusBadgeDot,
                {
                  backgroundColor:
                    statusStyle.dotColor,
                },
              ]}
            />

            <Text
              style={
                styles.statusBadgeText
              }
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.caseDescription
          }
          numberOfLines={2}
        >
          {item.description ||
            'No description provided.'}
        </Text>

        <View
          style={
            styles.caseMeta
          }
        >
          <View
            style={
              styles.caseMetaItem
            }
          >
            <Text
              style={
                styles.caseMetaLabel
              }
            >
              ORGANISATION
            </Text>

            <Text
              style={
                styles.caseMetaValue
              }
              numberOfLines={1}
            >
              {organisationName}
            </Text>
          </View>

          <View
            style={
              styles.caseMetaItem
            }
          >
            <Text
              style={
                styles.caseMetaLabel
              }
            >
              FUNDING AGREEMENT
            </Text>

            <Text
              style={
                styles.caseMetaValue
              }
              numberOfLines={1}
            >
              {agreementNumber}
            </Text>
          </View>

          <View
            style={
              styles.caseMetaItem
            }
          >
            <Text
              style={
                styles.caseMetaLabel
              }
            >
              PRIORITY
            </Text>

            <Text
              style={
                styles.caseMetaValue
              }
            >
              {item.priority ||
                'MEDIUM'}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.caseCardFooter
          }
        >
          <Text
            style={
              styles.viewCase
            }
          >
            VIEW CASE
          </Text>

          <Text
            style={
              styles.viewCaseArrow
            }
          >
            →
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// --------------------------------------------------
// STATUS STYLE
// --------------------------------------------------

function getStatusStyle(status) {
  switch (status) {
    case 'APPROVED':
      return {
        backgroundColor:
          '#E8F3EE',
        dotColor:
          '#007A4D',
        accent: {
          backgroundColor:
            '#007A4D',
        },
      };

    case 'ACTION REQUIRED':
      return {
        backgroundColor:
          '#FFF3CD',
        dotColor:
          '#D97706',
        accent: {
          backgroundColor:
            '#D97706',
        },
      };

    case 'UNDER REVIEW':
      return {
        backgroundColor:
          '#E8F0F7',
        dotColor:
          '#003DA5',
        accent: {
          backgroundColor:
            '#003DA5',
        },
      };

    case 'IN PROGRESS':
      return {
        backgroundColor:
          '#E8F3EE',
        dotColor:
          '#007A4D',
        accent: {
          backgroundColor:
            '#007A4D',
        },
      };

    default:
      return {
        backgroundColor:
          '#F0F0F0',
        dotColor:
          '#777777',
        accent: {
          backgroundColor:
            '#777777',
        },
      };
  }
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  content: {
    flexGrow: 1,
  },

  /* FLAG */

  flagStrip: {
    height: 5,
    flexDirection: 'row',
    width: '100%',
  },

  flagSection: {
    flex: 1,
  },

  flagRed: {
    backgroundColor: '#D22B2B',
  },

  flagWhite: {
    backgroundColor: '#FFFFFF',
  },

  flagGreen: {
    backgroundColor: '#007A4D',
  },

  flagGold: {
    backgroundColor: '#FFB81C',
  },

  flagBlue: {
    backgroundColor: '#003DA5',
  },

  flagBlack: {
    backgroundColor: '#000000',
  },

  /* GOVERNMENT HEADER */

  topHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },

  topHeaderTablet: {
    paddingHorizontal: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  coatContainer: {
    width: 65,
    height: 65,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },

  coatPlaceholder: {
    color: '#777777',
    fontSize: 16,
    fontWeight: '900',
  },

  brandText: {
    flex: 1,
  },

  brandTitle: {
    color: '#222222',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  departmentText: {
    color: '#555555',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  republicText: {
    color: '#888888',
    fontSize: 9,
    marginTop: 3,
    letterSpacing: 0.4,
  },

  sloganArea: {
    marginTop: 15,
    alignItems: 'flex-start',
  },

  slogan: {
    color: '#666666',
    fontSize: 10,
    fontStyle: 'italic',
  },

  sloganLine: {
    height: 2,
    width: 55,
    backgroundColor: '#D97706',
    marginTop: 6,
  },

  userArea: {
    marginTop: 18,
    alignItems: 'flex-start',
  },

  userSmall: {
    color: '#999999',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  userRole: {
    color: '#222222',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
  },

  userEmail: {
    color: '#777777',
    fontSize: 9,
    marginTop: 2,
    maxWidth: 250,
  },

  dashboardButton: {
    marginTop: 9,
    backgroundColor: '#222222',
    paddingHorizontal: 15,
    paddingVertical: 9,
  },

  dashboardButtonPressed: {
    opacity: 0.75,
  },

  dashboardButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  /* SYSTEM BAR */

  systemBar: {
    backgroundColor: '#222222',
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  systemName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },

  systemDescription: {
    color: '#BDBDBD',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 3,
    letterSpacing: 0.5,
  },

  systemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  flagMini: {
    width: 28,
    height: 18,
    marginRight: 12,
    overflow: 'hidden',
  },

  miniRed: {
    height: 5,
    backgroundColor: '#D22B2B',
  },

  miniGreen: {
    height: 7,
    backgroundColor: '#007A4D',
  },

  miniBlue: {
    height: 6,
    backgroundColor: '#003DA5',
  },

  statusBox: {
    alignItems: 'flex-end',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#35A853',
    marginBottom: 3,
  },

  statusLabel: {
    color: '#AAAAAA',
    fontSize: 7,
    fontWeight: '800',
  },

  statusValue: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
  },

  /* NAVIGATION */

  navigation: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E2E2',
    flexDirection: 'row',
    paddingHorizontal: 20,
    flexWrap: 'wrap',
  },

  navItem: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginRight: 3,
  },

  navActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#D97706',
  },

  navText: {
    color: '#777777',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  navActiveText: {
    color: '#222222',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  subtitle: {
    color: '#999999',
    fontSize: 7,
    marginTop: 3,
  },

  /* MAIN */

  main: {
    paddingHorizontal: 20,
    paddingVertical: 22,
  },

  mainTablet: {
    paddingHorizontal: 45,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  breadcrumbHome: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '900',
  },

  breadcrumbSlash: {
    color: '#AAAAAA',
    fontSize: 9,
    marginHorizontal: 7,
  },

  breadcrumbCurrent: {
    color: '#777777',
    fontSize: 9,
    fontWeight: '700',
  },

  pageHeader: {
    marginBottom: 28,
  },

  pageHeaderTablet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  pageHeadingLeft: {
    flex: 1,
  },

  orangeHeadingLine: {
    width: 45,
    height: 4,
    backgroundColor: '#D97706',
    marginBottom: 10,
  },

  pageTitle: {
    color: '#222222',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  pageDescription: {
    color: '#777777',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
    maxWidth: 700,
  },

  createButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 17,
    paddingVertical: 12,
    marginTop: 15,
    alignSelf: 'flex-start',
  },

  createButtonPressed: {
    opacity: 0.75,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 13,
    marginTop: 10,
  },

  sectionOrangeBar: {
    width: 4,
    height: 35,
    backgroundColor: '#D97706',
    marginRight: 10,
  },

  sectionTitle: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  sectionSubtitle: {
    color: '#888888',
    fontSize: 9,
    marginTop: 4,
  },

  /* FORM */

  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E4',
    padding: 18,
    marginBottom: 24,
  },

  formHeader: {
    marginBottom: 18,
  },

  formHeaderAccent: {
    width: 30,
    height: 3,
    backgroundColor: '#222222',
    marginBottom: 8,
  },

  formTitle: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  formDescription: {
    color: '#888888',
    fontSize: 9,
    marginTop: 4,
    lineHeight: 15,
  },

  formGrid: {
    width: '100%',
  },

  fieldFull: {
    width: '100%',
    marginBottom: 15,
  },

  fieldHalf: {
    width: '48%',
    marginRight: '2%',
  },

  label: {
    color: '#444444',
    fontSize: 8,
    fontWeight: '900',
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.4,
  },

  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#D7D7D7',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    color: '#222222',
    fontSize: 11,
  },

  inputError: {
    borderColor: '#C62828',
    borderWidth: 1.5,
    backgroundColor: '#FFF8F8',
  },

  errorText: {
    color: '#C62828',
    fontSize: 10,
    marginTop: 5,
    fontWeight: '600',
    flex: 1,
  },

  helperText: {
    color: '#888888',
    fontSize: 10,
    marginTop: 5,
  },

  characterCount: {
    color: '#888888',
    fontSize: 10,
    marginTop: 5,
    marginLeft: 10,
  },

  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },

  selectInput: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#D7D7D7',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectInputActive: {
    borderColor: '#D97706',
    backgroundColor: '#FFFDF8',
  },

  disabledInput: {
    backgroundColor: '#EEEEEE',
    borderColor: '#DDDDDD',
  },

  selectText: {
    color: '#222222',
    fontSize: 11,
    flex: 1,
    paddingRight: 10,
  },

  placeholderText: {
    color: '#999999',
    fontSize: 11,
    flex: 1,
    paddingRight: 10,
  },

  selectArrow: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '900',
  },

  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7D7D7',
    borderTopWidth: 0,
    maxHeight: 220,
  },

  dropdownItem: {
    paddingHorizontal: 13,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  dropdownItemTitle: {
    color: '#222222',
    fontSize: 10,
    fontWeight: '900',
  },

  dropdownItemSubtitle: {
    color: '#777777',
    fontSize: 8,
    marginTop: 4,
  },

  dropdownEmpty: {
    color: '#777777',
    fontSize: 9,
    padding: 15,
    textAlign: 'center',
  },

  /* WORKFLOW */

  workflowNotice: {
    backgroundColor: '#F8F8F5',
    padding: 13,
    marginTop: 8,
    flexDirection: 'row',
  },

  workflowNoticeAccent: {
    width: 4,
    backgroundColor: '#D97706',
    marginRight: 11,
  },

  workflowNoticeContent: {
    flex: 1,
  },

  workflowNoticeTitle: {
    color: '#333333',
    fontSize: 9,
    fontWeight: '900',
  },

  workflowNoticeText: {
    color: '#007A4D',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 5,
  },

  workflowNoticeDescription: {
    color: '#888888',
    fontSize: 8,
    lineHeight: 13,
    marginTop: 4,
  },

  /* FORM ACTIONS */

  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },

  cancelButton: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginRight: 8,
    marginBottom: 5,
  },

  cancelPressed: {
    backgroundColor: '#F5F5F5',
  },

  cancelText: {
    color: '#666666',
    fontSize: 8,
    fontWeight: '900',
  },

  saveButton: {
    backgroundColor: '#222222',
    minHeight: 40,
    paddingHorizontal: 17,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },

  saveDisabled: {
    opacity: 0.6,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  savingText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    marginLeft: 7,
  },

  /* INFO */

  infoCard: {
    backgroundColor: '#222222',
    padding: 16,
    flexDirection: 'row',
    marginBottom: 28,
  },

  infoAccent: {
    width: 4,
    backgroundColor: '#D97706',
    marginRight: 12,
  },

  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  infoIconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  infoText: {
    color: '#C9C9C9',
    fontSize: 8,
    lineHeight: 14,
    marginTop: 5,
    marginBottom: 8,
  },

  /* DESCRIPTION FOOTER */

  descriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  /* ACTIONS */

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 25,
  },

  cancel: {
    borderWidth: 1,
    borderColor: '#E4E4E4',
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginRight: 10,
  },

  save: {
    backgroundColor: '#D97706',
    paddingHorizontal: 17,
    paddingVertical: 12,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* LOADING */

  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    marginBottom: 20,
  },

  loadingText: {
    color: '#777777',
    fontSize: 10,
    marginTop: 10,
  },

  /* STATS */

  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 25,
  },

  statusGridDesktop: {
    flexWrap: 'nowrap',
  },

  statusCard: {
    flex: 1,
    minWidth: 145,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderTopWidth: 4,
    padding: 16,
  },

  statusLabel: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  statusNumber: {
    color: '#222222',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 8,
  },

  /* EMPTY */

  emptyState: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2E2',
    padding: 35,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
    marginBottom: 20,
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptyIconText: {
    color: '#888888',
    fontSize: 20,
    fontWeight: '900',
  },

  emptyTitle: {
    color: '#333333',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },

  emptyText: {
    color: '#888888',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 5,
    maxWidth: 500,
    lineHeight: 15,
  },

  emptyButton: {
    backgroundColor: '#222222',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 18,
  },

  emptyButtonPressed: {
    opacity: 0.75,
  },

  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  workflow: {
    marginTop: 22,
    padding: 14,
    backgroundColor: '#F8F8F5',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 9,
  },

  workflowText: {
    color: '#007A4D',
    fontSize: 9,
    fontWeight: '900',
  },

  workflowArrow: {
    color: '#D97706',
    fontSize: 17,
    fontWeight: '900',
  },

  /* CASE LIST */

  caseList: {
    width: '100%',
    gap: 12,
  },

  caseCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    overflow: 'hidden',
  },

  caseCardPressed: {
    opacity: 0.9,
  },

  caseCardAccent: {
    height: 4,
    width: '100%',
  },

  caseCardInner: {
    padding: 16,
  },

  caseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  caseCardHeading: {
    flex: 1,
    paddingRight: 15,
  },

  caseNumber: {
    color: '#D97706',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  caseTitle: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 5,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 5,
  },

  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusBadgeText: {
    color: '#333333',
    fontSize: 7,
    fontWeight: '900',
  },

  caseDescription: {
    color: '#666666',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 12,
  },

  caseMeta: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  caseMetaItem: {
    flex: 1,
    minWidth: 160,
    marginRight: 15,
    marginBottom: 8,
  },

  caseMetaLabel: {
    color: '#AAAAAA',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 4,
  },

  caseMetaValue: {
    color: '#444444',
    fontSize: 9,
    lineHeight: 14,
  },

  caseCardFooter: {
    marginTop: 8,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  viewCase: {
    color: '#D97706',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  viewCaseArrow: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '900',
    marginLeft: 5,
  },

  /* FOOTER */

  footer: {
    backgroundColor: '#222222',
    marginTop: 20,
    paddingBottom: 25,
  },

  footerFlag: {
    height: 5,
    flexDirection: 'row',
  },

  footerRed: {
    flex: 1,
    backgroundColor: '#D22B2B',
  },

  footerGreen: {
    flex: 1,
    backgroundColor: '#007A4D',
  },

  footerBlue: {
    flex: 1,
    backgroundColor: '#003DA5',
  },

  footerGold: {
    flex: 1,
    backgroundColor: '#FFB81C',
  },

  footerContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },

  footerTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  footerDepartment: {
    color: '#BDBDBD',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
  },

  footerRepublic: {
    color: '#888888',
    fontSize: 8,
    marginTop: 5,
  },

  footerLine: {
    width: 60,
    height: 2,
    backgroundColor: '#D97706',
    marginVertical: 12,
  },

  footerSystem: {
    color: '#AAAAAA',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  footerCopyright: {
    color: '#666666',
    fontSize: 7,
    marginTop: 5,
  },
});