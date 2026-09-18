import React, { useCallback, useState } from 'react';

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
  const { user } = useAuth();

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

      const loadedCases = casesResult.data || [];

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
  // ORGANISATION SELECTION
  // --------------------------------------------------

  const selectOrganisation = (organisation) => {
    setSelectedOrganisation(organisation);

    // Changing organisation invalidates the previous
    // funding agreement.
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

    // Extra safety check
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
      normaliseCaseNumber(caseNumber.trim());

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
      /*
        Check for duplicate case number
        in Supabase.
      */

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

      // Final relationship check before database insert
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

          created_by:
            user.id,

          responsible_user_id:
            null,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Accountability Case Created',
        `Case ${cleanedCaseNumber} has been created successfully.`
      );

      // Reset form
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

      setShowForm(false);

      await loadData();
    } catch (error) {
      console.error(
        'Create case error:',
        error
      );

      /*
        Handle Supabase duplicate constraint
        as an additional safety layer.
      */

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
          barStyle="light-content"
          backgroundColor="#111111"
        />

        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
            />
          }
        >
          {/* SOUTH AFRICAN FLAG STRIP */}

          <View style={styles.flagStrip}>
            <View style={styles.black} />
            <View style={styles.gold} />
            <View style={styles.green} />
            <View style={styles.blue} />
            <View style={styles.red} />
          </View>

          {/* HEADER */}

          <View style={styles.header}>
            <Pressable
              onPress={() =>
                router.replace(
                  '/dsac/dashboard'
                )
              }
            >
              <Text style={styles.back}>
                ← Dashboard
              </Text>
            </Pressable>

            <View>
              <Text style={styles.brand}>
                CIVITRACK
              </Text>

              <Text style={styles.subtitle}>
                DSAC Accountability Cases
              </Text>
            </View>
          </View>

          <View style={styles.main}>
            {/* PAGE HEADING */}

            <View style={styles.heading}>
              <View
                style={
                  styles.headingContent
                }
              >
                <Text style={styles.title}>
                  Accountability Cases
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  Create, assign and monitor
                  accountability cases linked
                  to funding agreements.
                </Text>
              </View>

              <Pressable
                style={styles.createButton}
                onPress={() =>
                  setShowForm(
                    !showForm
                  )
                }
              >
                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  + CREATE CASE
                </Text>
              </Pressable>
            </View>

            {/* CREATE CASE FORM */}

            {showForm && (
              <View style={styles.form}>
                <View style={styles.formTop} />

                <Text
                  style={styles.formTitle}
                >
                  Create Accountability Case
                </Text>

                <Text
                  style={
                    styles.formDescription
                  }
                >
                  A case becomes the main
                  accountability workspace
                  for an organisation.
                </Text>

                {/* CASE NUMBER */}

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

                {/* ORGANISATION */}

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
                        No organisations
                        available.
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

                {/* FUNDING AGREEMENT */}

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
                          No funding agreements
                          found for this
                          organisation.
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
                                  ? ` • ${agreement.currency || 'ZAR'} ${Number(
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

                {/* DESCRIPTION */}

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
                    onPress={createCase}
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
            )}

            {/* LOADING */}

            {loading ? (
              <View
                style={
                  styles.loadingContainer
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#007A4D"
                />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Loading accountability
                  cases...
                </Text>
              </View>
            ) : (
              <>
                {/* STATUS CARDS */}

                <View
                  style={styles.statusGrid}
                >
                  <StatusCard
                    label="DRAFT"
                    number={stats.DRAFT}
                  />

                  <StatusCard
                    label="IN PROGRESS"
                    number={
                      stats['IN PROGRESS']
                    }
                  />

                  <StatusCard
                    label="UNDER REVIEW"
                    number={
                      stats['UNDER REVIEW']
                    }
                  />

                  <StatusCard
                    label="ACTION REQUIRED"
                    number={
                      stats[
                        'ACTION REQUIRED'
                      ]
                    }
                  />

                  <StatusCard
                    label="APPROVED"
                    number={
                      stats.APPROVED
                    }
                  />
                </View>

                {/* CASES */}

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  ACCOUNTABILITY CASES
                </Text>

                {cases.length === 0 ? (
                  <View
                    style={styles.empty}
                  >
                    <View
                      style={
                        styles.caseIcon
                      }
                    >
                      <Text
                        style={
                          styles.caseIconText
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
                      No accountability cases
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Create a case after an
                      organisation and
                      funding agreement have
                      been established.
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
                          key={item.id}
                          item={item}
                        />
                      )
                    )}
                  </View>
                )}
              </>
            )}
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
}) {
  return (
    <View style={styles.statusCard}>
      <Text
        style={styles.statusLabel}
      >
        {label}
      </Text>

      <Text
        style={styles.statusNumber}
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

  return (
    <Pressable
      style={styles.caseCard}
      onPress={() =>
        router.push(
          `/cases/${item.id}`
        )
      }
    >
      <View style={styles.caseCardHeader}>
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
            getStatusStyle(
              item.status
            ),
          ]}
        >
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
        <Text
          style={
            styles.caseMetaText
          }
        >
          Organisation: {organisationName}
        </Text>

        <Text
          style={
            styles.caseMetaText
          }
        >
          Agreement: {agreementNumber}
        </Text>

        <Text
          style={
            styles.caseMetaText
          }
        >
          Priority:{' '}
          {item.priority ||
            'MEDIUM'}
        </Text>
      </View>

      <Text
        style={
          styles.viewCase
        }
      >
        VIEW CASE →
      </Text>
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
      };

    case 'ACTION REQUIRED':
      return {
        backgroundColor:
          '#FFF3CD',
      };

    case 'UNDER REVIEW':
      return {
        backgroundColor:
          '#E8F0F7',
      };

    case 'IN PROGRESS':
      return {
        backgroundColor:
          '#E8F3EE',
      };

    default:
      return {
        backgroundColor:
          '#F0F0F0',
      };
  }
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F3F0',
  },

  flagStrip: {
    height: 7,
    flexDirection: 'row',
  },

  black: {
    flex: 1,
    backgroundColor: '#111111',
  },

  gold: {
    flex: 1,
    backgroundColor: '#FFB81C',
  },

  green: {
    flex: 2,
    backgroundColor: '#007A4D',
  },

  blue: {
    flex: 1,
    backgroundColor: '#001489',
  },

  red: {
    flex: 1,
    backgroundColor: '#DE3831',
  },

  header: {
    backgroundColor: '#111111',
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  back: {
    color: '#FFB81C',
    fontSize: 12,
    fontWeight: '800',
  },

  brand: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'right',
  },

  subtitle: {
    color: '#AAAAAA',
    fontSize: 10,
    marginTop: 3,
  },

  main: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    padding: 30,
  },

  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 25,
  },

  headingContent: {
    flex: 1,
  },

  title: {
    color: '#171717',
    fontSize: 28,
    fontWeight: '900',
  },

  description: {
    color: '#666666',
    fontSize: 13,
    marginTop: 7,
  },

  createButton: {
    backgroundColor: '#007A4D',
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginLeft: 20,
  },

  createButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  form: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 25,
    marginBottom: 25,
    overflow: 'hidden',
  },

  formTop: {
    height: 5,
    backgroundColor: '#111111',
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },

  formTitle: {
    marginTop: 5,
    color: '#222222',
    fontSize: 21,
    fontWeight: '900',
  },

  formDescription: {
    color: '#777777',
    fontSize: 12,
    marginTop: 5,
  },

  label: {
    color: '#333333',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 7,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 13,
    color: '#222222',
    fontSize: 14,
  },

  inputError: {
    borderColor: '#C62828',
    borderWidth: 1.5,
    backgroundColor: '#FFF8F8',
  },

  errorText: {
    color: '#C62828',
    fontSize: 11,
    marginTop: 5,
    fontWeight: '600',
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
  },

  selectInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectInputActive: {
    borderColor: '#007A4D',
  },

  disabledInput: {
    backgroundColor: '#EEEEEE',
    borderColor: '#DDDDDD',
  },

  selectText: {
    color: '#222222',
    fontSize: 14,
    flex: 1,
    paddingRight: 10,
  },

  placeholderText: {
    color: '#888888',
    fontSize: 14,
    flex: 1,
    paddingRight: 10,
  },

  selectArrow: {
    color: '#007A4D',
    fontSize: 11,
    fontWeight: '900',
  },

  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
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
    fontSize: 13,
    fontWeight: '800',
  },

  dropdownItemSubtitle: {
    color: '#777777',
    fontSize: 11,
    marginTop: 4,
  },

  dropdownEmpty: {
    color: '#777777',
    fontSize: 12,
    padding: 15,
    textAlign: 'center',
  },

  textArea: {
    height: 110,
    paddingTop: 13,
  },

  descriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 25,
  },

  cancel: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    paddingHorizontal: 20,
    paddingVertical: 13,
  },

  cancelText: {
    color: '#555555',
    fontSize: 10,
    fontWeight: '900',
  },

  save: {
    backgroundColor: '#007A4D',
    paddingHorizontal: 20,
    paddingVertical: 13,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveDisabled: {
    opacity: 0.7,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 45,
    alignItems: 'center',
    marginBottom: 30,
  },

  loadingText: {
    color: '#777777',
    fontSize: 12,
    marginTop: 12,
  },

  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 30,
  },

  statusCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    borderTopColor: '#007A4D',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 17,
  },

  statusLabel: {
    color: '#777777',
    fontSize: 9,
    fontWeight: '900',
  },

  statusNumber: {
    color: '#111111',
    fontSize: 27,
    fontWeight: '900',
    marginTop: 8,
  },

  sectionTitle: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },

  empty: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 45,
    alignItems: 'center',
  },

  caseIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },

  caseIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  emptyTitle: {
    color: '#222222',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 15,
  },

  emptyText: {
    color: '#777777',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 500,
    marginTop: 7,
  },

  workflow: {
    marginTop: 25,
    padding: 15,
    backgroundColor: '#F5F5F2',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },

  workflowText: {
    color: '#007A4D',
    fontSize: 11,
    fontWeight: '900',
  },

  workflowArrow: {
    color: '#FFB81C',
    fontSize: 18,
    fontWeight: '900',
  },

  caseList: {
    gap: 12,
  },

  caseCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 20,
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
    color: '#007A4D',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  caseTitle: {
    color: '#222222',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusBadgeText: {
    color: '#333333',
    fontSize: 8,
    fontWeight: '900',
  },

  caseDescription: {
    color: '#666666',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  caseMeta: {
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    gap: 5,
  },

  caseMetaText: {
    color: '#777777',
    fontSize: 10,
  },

  viewCase: {
    color: '#007A4D',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 15,
  },
});