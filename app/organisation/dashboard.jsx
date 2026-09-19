import React, { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import ProtectedRoute from '../../src/components/ProtectedRoute';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { ROLES } from '../../src/constants/roles';

/* ============================================================
   CIVITRACK GOVERNMENT COLOURS
============================================================ */

const GOV = {
  orange: '#F7941D',
  orangeDark: '#E7830E',
  green: '#009366',
  blue: '#0053A1',
  red: '#F05D2A',
  black: '#000000',
  white: '#FFFFFF',
  background: '#F5F5F5',
  border: '#DDDDDD',
  borderLight: '#E5E5E5',
  text: '#222222',
  textDark: '#333333',
  textSecondary: '#777777',
  textLight: '#999999',
};

/* ============================================================
   STAT CARD
============================================================ */

const StatCard = ({
  title,
  value,
  description,
  accent = GOV.green,
}) => (
  <View style={styles.statCard}>
    <View
      style={[
        styles.statAccent,
        { backgroundColor: accent },
      ]}
    />

    <Text style={styles.statLabel}>{title}</Text>

    <Text style={styles.statNumber}>{value}</Text>

    <Text style={styles.statDescription}>
      {description}
    </Text>

    <View
      style={[
        styles.statBottomAccent,
        { backgroundColor: accent },
      ]}
    />
  </View>
);

/* ============================================================
   MAIN DASHBOARD
============================================================ */

export default function OrganisationDashboardScreen() {
  const {
    user,
    profile,
    role,
    loading: authLoading,
    signOut,
  } = useAuth();

  const { width } = useWindowDimensions();

  const isDesktop = width >= 1000;

  const [organisation, setOrganisation] = useState(null);
  const [membership, setMembership] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /* ==========================================================
     ADD TEAM FORM
  ========================================================== */

  const [showAddTeamForm, setShowAddTeamForm] =
    useState(false);

  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] =
    useState('');
  const [teamDepartment, setTeamDepartment] =
    useState('');
  const [teamLead, setTeamLead] = useState('');
  const [teamStatus, setTeamStatus] =
    useState('ACTIVE');

  /* ==========================================================
     LOAD DASHBOARD
  ========================================================== */

  const loadDashboard = useCallback(
    async (showRefresh = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        console.log(
          'ORGANISATION DASHBOARD: loading for user',
          user.id
        );

        /* ------------------------------------------------------
           CURRENT USER MEMBERSHIP
        ------------------------------------------------------ */

        const {
          data: currentMembership,
          error: membershipError,
        } = await supabase
          .from('organisation_memberships')
          .select(`
            id,
            organisation_id,
            user_id,
            membership_role,
            status,
            joined_at,
            left_at,
            created_at
          `)
          .eq('user_id', user.id)
          .eq('status', 'ACTIVE')
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          console.error(
            'ORGANISATION DASHBOARD: membership error',
            membershipError
          );

          throw new Error(
            membershipError.message
          );
        }

        if (!currentMembership) {
          setMembership(null);
          setOrganisation(null);
          setMembers([]);
          setMemberProfiles({});

          setError(
            'Your account is not currently assigned to an active organisation.'
          );

          return;
        }

        setMembership(currentMembership);

        const organisationId =
          currentMembership.organisation_id;

        /* ------------------------------------------------------
           ORGANISATION
        ------------------------------------------------------ */

        const {
          data: organisationData,
          error: organisationError,
        } = await supabase
          .from('organisations')
          .select(`
            id,
            name,
            organisation_type,
            registration_number,
            email,
            phone,
            address,
            province,
            status,
            created_at,
            updated_at
          `)
          .eq('id', organisationId)
          .maybeSingle();

        if (organisationError) {
          console.error(
            'ORGANISATION DASHBOARD: organisation error',
            organisationError
          );

          throw new Error(
            organisationError.message
          );
        }

        if (!organisationData) {
          setOrganisation(null);

          throw new Error(
            'The organisation linked to your account could not be found.'
          );
        }

        setOrganisation(organisationData);

        /* ------------------------------------------------------
           ALL ORGANISATION MEMBERS
        ------------------------------------------------------ */

        const {
          data: membershipsData,
          error: membershipsError,
        } = await supabase
          .from('organisation_memberships')
          .select(`
            id,
            organisation_id,
            user_id,
            membership_role,
            status,
            joined_at,
            left_at,
            created_at
          `)
          .eq(
            'organisation_id',
            organisationId
          )
          .order('created_at', {
            ascending: false,
          });

        if (membershipsError) {
          console.error(
            'ORGANISATION DASHBOARD: members error',
            membershipsError
          );

          throw new Error(
            membershipsError.message
          );
        }

        const organisationMembers =
          membershipsData || [];

        setMembers(organisationMembers);

        /* ------------------------------------------------------
           MEMBER PROFILES
        ------------------------------------------------------ */

        const memberUserIds =
          organisationMembers.map(
            (item) => item.user_id
          );

        if (memberUserIds.length > 0) {
          const {
            data: profilesData,
            error: profilesError,
          } = await supabase
            .from('user_profiles')
            .select(`
              id,
              full_name,
              email,
              job_title,
              phone,
              role,
              is_active
            `)
            .in('id', memberUserIds);

          if (profilesError) {
            console.error(
              'ORGANISATION DASHBOARD: profile error',
              profilesError
            );

            throw new Error(
              profilesError.message
            );
          }

          const profileMap = {};

          (profilesData || []).forEach((item) => {
            profileMap[item.id] = item;
          });

          setMemberProfiles(profileMap);
        } else {
          setMemberProfiles({});
        }

        console.log(
          'ORGANISATION DASHBOARD: loaded successfully'
        );
      } catch (err) {
        console.error(
          'ORGANISATION DASHBOARD: unexpected error',
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load the organisation dashboard.';

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  /* ==========================================================
     REFRESH WHEN SCREEN OPENS
  ========================================================== */

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = () => {
    loadDashboard(true);
  };

  /* ==========================================================
     TEAM QUICK ACCESS
  ========================================================== */

  const handleTeamQuickAccess = () => {
    setShowAddTeamForm(true);
  };

  /* ==========================================================
     SIGN OUT
  ========================================================== */

  const handleSignOut = async () => {
    try {
      await signOut();

      router.replace('/auth/login');
    } catch (err) {
      console.error(
        'ORGANISATION DASHBOARD: sign out error',
        err
      );

      Alert.alert(
        'Sign Out Error',
        'Unable to sign out. Please try again.'
      );
    }
  };

  /* ==========================================================
     FUTURE MODULE
  ========================================================== */

  const handleComingSoon = (sectionName) => {
    Alert.alert(
      sectionName,
      `${sectionName} is connected to the CIVITRACK organisation portal. This module will become available as the workflow database is completed.`
    );
  };

  /* ==========================================================
     CREATE TEAM
  ========================================================== */

  const handleCreateTeam = () => {
    if (!teamName.trim()) {
      Alert.alert(
        'Team Name Required',
        'Please enter a name for the team.'
      );

      return;
    }

    Alert.alert(
      'Team Ready',
      `The team "${teamName.trim()}" has been captured and is ready to be connected to the organisation team database.`
    );

    setTeamName('');
    setTeamDescription('');
    setTeamDepartment('');
    setTeamLead('');
    setTeamStatus('ACTIVE');

    setShowAddTeamForm(false);
  };

  /* ==========================================================
     CANCEL TEAM
  ========================================================== */

  const handleCancelTeam = () => {
    setTeamName('');
    setTeamDescription('');
    setTeamDepartment('');
    setTeamLead('');
    setTeamStatus('ACTIVE');

    setShowAddTeamForm(false);
  };

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const activeMembers = members.filter(
    (item) => item.status === 'ACTIVE'
  );

  const activeStaff = activeMembers.filter(
    (item) =>
      item.membership_role === 'ORG_STAFF'
  );

  const activeAdmins = activeMembers.filter(
    (item) =>
      item.membership_role === 'ORG_ADMIN'
  );

  const activeCollaborators =
    activeMembers.filter(
      (item) =>
        item.membership_role ===
        'EXTERNAL_COLLABORATOR'
    );

  const inactiveMembers = members.filter(
    (item) => item.status !== 'ACTIVE'
  );

  const currentUserProfile = profile;

  const displayName =
    currentUserProfile?.full_name ||
    currentUserProfile?.email ||
    'Organisation Administrator';

  /* ==========================================================
     HELPERS
  ========================================================== */

  const getOrganisationTypeLabel = (type) => {
    switch (type) {
      case 'NPO':
        return 'Non-Profit Organisation';

      case 'PUBLIC_ENTITY':
        return 'Public Entity';

      default:
        return type || 'Not specified';
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'ACTIVE':
        return {
          backgroundColor: '#E6F4EF',
          color: GOV.green,
        };

      case 'SUSPENDED':
        return {
          backgroundColor: '#FFF1E1',
          color: GOV.orange,
        };

      case 'INACTIVE':
        return {
          backgroundColor: '#FDEBE7',
          color: GOV.red,
        };

      default:
        return {
          backgroundColor: '#EAF2FA',
          color: GOV.blue,
        };
    }
  };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={GOV.white}
        />

        <View style={styles.loadingFlagStrip}>
          <View style={styles.flagRed} />
          <View style={styles.flagWhite} />
          <View style={styles.flagGreen} />
          <View style={styles.flagGold} />
          <View style={styles.flagBlue} />
          <View style={styles.flagBlack} />
        </View>

        <View style={styles.loadingHeader}>
          <View style={styles.loadingBrand}>
            <Text style={styles.loadingBrandTitle}>
              sport, arts & culture
            </Text>

            <Text style={styles.loadingDepartment}>
              Department of Sport, Arts and Culture
            </Text>

            <Text style={styles.loadingRepublic}>
              REPUBLIC OF SOUTH AFRICA
            </Text>
          </View>
        </View>

        <View style={styles.loadingSystemBar}>
          <Text style={styles.loadingSystemName}>
            CIVITRACK
          </Text>

          <Text style={styles.loadingSystemDescription}>
            Public Funding & Accountability Management System
          </Text>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={GOV.green}
          />

          <Text style={styles.loadingTitle}>
            Loading CIVITRACK
          </Text>

          <Text style={styles.loadingText}>
            Loading your organisation workspace...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ==========================================================
     NO ORGANISATION
  ========================================================== */

  if (!organisation) {
    return (
      <ProtectedRoute
        allowedRoles={[
          ROLES.ORG_ADMIN,
          ROLES.ORG_STAFF,
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={GOV.white}
          />

          <View style={styles.flagStrip}>
            <View style={styles.flagRed} />
            <View style={styles.flagWhite} />
            <View style={styles.flagGreen} />
            <View style={styles.flagGold} />
            <View style={styles.flagBlue} />
            <View style={styles.flagBlack} />
          </View>

          <View style={styles.emptyHeader}>
            <View>
              <Text style={styles.emptyHeaderBrand}>
                sport, arts & culture
              </Text>

              <Text style={styles.emptyHeaderDepartment}>
                Department of Sport, Arts and Culture
              </Text>

              <Text style={styles.emptyHeaderRepublic}>
                REPUBLIC OF SOUTH AFRICA
              </Text>
            </View>

            <Text style={styles.emptyHeaderSystem}>
              CIVITRACK
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={GOV.green}
              />
            }
          >
            <View style={styles.emptyAccent} />

            <Text style={styles.emptyEyebrow}>
              ORGANISATION PORTAL
            </Text>

            <Text style={styles.emptyTitle}>
              Organisation Not Found
            </Text>

            <Text style={styles.emptyText}>
              {error ||
                'Your account has not been assigned to an active organisation.'}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleRefresh}
            >
              <Text style={styles.primaryButtonText}>
                REFRESH
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleSignOut}
            >
              <Text style={styles.secondaryButtonText}>
                SIGN OUT
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ProtectedRoute>
    );
  }

  const statusStyle = getStatusStyle(
    organisation.status
  );

  /* ==========================================================
     MAIN DASHBOARD
  ========================================================== */

  return (
    <ProtectedRoute
      allowedRoles={[
        ROLES.ORG_ADMIN,
        ROLES.ORG_STAFF,
      ]}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={GOV.green}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ==================================================
              FLAG
          ================================================== */}

          <View style={styles.flagStrip}>
            <View style={styles.flagRed} />
            <View style={styles.flagWhite} />
            <View style={styles.flagGreen} />
            <View style={styles.flagGold} />
            <View style={styles.flagBlue} />
            <View style={styles.flagBlack} />
          </View>

          {/* ==================================================
              GOVERNMENT HEADER
          ================================================== */}

          <View
            style={[
              styles.topHeader,
              !isDesktop && styles.topHeaderTablet,
            ]}
          >
            <View style={styles.brandArea}>
              <View style={styles.coatPlaceholder}>
                <Text style={styles.coatPlaceholderText}>
                  SA
                </Text>
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

            {isDesktop && (
              <View style={styles.sloganArea}>
                <Text style={styles.slogan}>
                  INSPIRING A NATION OF WINNERS
                </Text>

                <View style={styles.sloganLine} />
              </View>
            )}

            <View style={styles.userArea}>
              <Text style={styles.userSmall}>
                SYSTEM USER
              </Text>

              <Text style={styles.userRole}>
                {role === ROLES.ORG_ADMIN
                  ? 'ORGANISATION ADMINISTRATOR'
                  : 'ORGANISATION STAFF'}
              </Text>

              <Text
                style={styles.userEmail}
                numberOfLines={1}
              >
                {profile?.email ||
                  user?.email ||
                  'Organisation User'}
              </Text>

              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.logoutPressed,
                ]}
              >
                <Text style={styles.logoutText}>
                  SIGN OUT
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ==================================================
              CIVITRACK SYSTEM BAR
          ================================================== */}

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
                <View style={styles.systemStatusDot} />

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

          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <View style={styles.navigation}>
            <View style={styles.navActive}>
              <Text style={styles.navActiveText}>
                HOME
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navPressed,
              ]}
              onPress={() => {
                router.push({
                  pathname: '/organisation/workspace',
                  params: {
                    organisationId: organisation.id,
                  },
                });
              }}
            >
              <Text style={styles.navText}>
                WORKSPACE
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navPressed,
              ]}
              onPress={handleTeamQuickAccess}
            >
              <Text style={styles.navText}>
                TEAM
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navPressed,
              ]}
              onPress={() => handleComingSoon('FUNDING')}
            >
              <Text style={styles.navText}>
                FUNDING
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navPressed,
              ]}
              onPress={() =>
                handleComingSoon('ACCOUNTABILITY')
              }
            >
              <Text style={styles.navText}>
                ACCOUNTABILITY
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navPressed,
              ]}
              onPress={() =>
                handleComingSoon('DOCUMENTS')
              }
            >
              <Text style={styles.navText}>
                DOCUMENTS
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.navItem,
                pressed && styles.navPressed,
              ]}
              onPress={() =>
                handleComingSoon('REPORTS')
              }
            >
              <Text style={styles.navText}>
                REPORTS
              </Text>
            </Pressable>
          </View>

          {/* ==================================================
              MAIN CONTENT
          ============================================== */}

          <View
            style={[
              styles.main,
              !isDesktop && styles.mainTablet,
            ]}
          >
            {/* BREADCRUMB */}

            <View style={styles.breadcrumb}>
              <Text style={styles.breadcrumbHome}>
                HOME
              </Text>

              <Text style={styles.breadcrumbSlash}>
                /
              </Text>

              <Text style={styles.breadcrumbCurrent}>
                ORGANISATION
              </Text>
            </View>

            {/* BREADCRUMB */}
              <Text style={styles.breadcrumbSlash}>
                /
              </Text>

              <Text style={styles.breadcrumbCurrent}>
                ORGANISATION PORTAL
              </Text>
            </View>

            {/* PAGE HEADER */}

            <View
              style={[
                styles.pageHeader,
                !isDesktop &&
                  styles.pageHeaderTablet,
              ]}
            >
              <View style={styles.pageHeadingLeft}>
                <View
                  style={styles.orangeHeadingLine}
                />

                <Text style={styles.pageTitle}>
                  Organisation Accountability Dashboard
                </Text>

                <Text
                  style={styles.pageDescription}
                >
                  Central administration and oversight
                  of your organisation's team,
                  funding activities and accountability
                  workspace.
                </Text>
              </View>

              <View style={styles.financialYear}>
                <Text style={styles.financialLabel}>
                  FINANCIAL YEAR
                </Text>

                <Text style={styles.financialValue}>
                  2026 / 2027
                </Text>
              </View>
            </View>

            {/* ORGANISATION OVERVIEW */}

            <SectionHeader
              title="ORGANISATION OVERVIEW"
              subtitle="Current organisation records and membership"
            />

            <View style={styles.stats}>
              <StatCard
                title="TEAM MEMBERS"
                value={String(members.length)}
                description="Registered organisation members"
                accent={GOV.green}
              />

              <StatCard
                title="ACTIVE MEMBERS"
                value={String(
                  activeMembers.length
                )}
                description="Currently active members"
                accent={GOV.orange}
              />

              <StatCard
                title="ORGANISATION STAFF"
                value={String(
                  activeStaff.length
                )}
                description="Active organisation staff"
                accent={GOV.blue}
              />

              <StatCard
                title="COLLABORATORS"
                value={String(
                  activeCollaborators.length
                )}
                description="External collaborators"
                accent={GOV.red}
              />
            </View>

            {/* ORGANISATION STATUS */}

            <SectionHeader
              title="ORGANISATION STATUS"
              subtitle="Current registration and workspace status"
            />

            <View style={styles.statusCard}>
              <View style={styles.statusCardContent}>
                <Text style={styles.statusCardLabel}>
                  REGISTERED ORGANISATION
                </Text>

                <Text
                  style={styles.statusOrganisationName}
                >
                  {organisation.name}
                </Text>

                <Text style={styles.statusDescription}>
                  Your organisation workspace is
                  currently connected to CIVITRACK.
                </Text>
              </View>

              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor:
                      statusStyle.backgroundColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusPillDot,
                    {
                      backgroundColor:
                        statusStyle.color,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.statusPillText,
                    {
                      color: statusStyle.color,
                    },
                  ]}
                >
                  {organisation.status}
                </Text>
              </View>
            </View>

            {/* REGISTERED DETAILS */}

            <SectionHeader
              title="REGISTERED DETAILS"
              subtitle="Official organisation information"
            />

            <View style={styles.infoCard}>
              <InfoRow
                label="Organisation Name"
                value={organisation.name}
              />

              <InfoRow
                label="Organisation Type"
                value={getOrganisationTypeLabel(
                  organisation.organisation_type
                )}
              />

              <InfoRow
                label="Registration Number"
                value={
                  organisation.registration_number ||
                  'Not provided'
                }
              />

              <InfoRow
                label="Email"
                value={
                  organisation.email ||
                  'Not provided'
                }
              />

              <InfoRow
                label="Phone"
                value={
                  organisation.phone ||
                  'Not provided'
                }
              />

              <InfoRow
                label="Province"
                value={
                  organisation.province ||
                  'Not provided'
                }
              />

              <InfoRow
                label="Address"
                value={
                  organisation.address ||
                  'Not provided'
                }
                last
              />
            </View>

            {/* USER PROFILE */}

            <SectionHeader
              title="USER PROFILE"
              subtitle="Your CIVITRACK account"
            />

            <View style={styles.accountCard}>
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>
                  {displayName
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>
                  {displayName}
                </Text>

                <Text style={styles.accountEmail}>
                  {user?.email ||
                    currentUserProfile?.email ||
                    'No email'}
                </Text>

                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>
                    {membership?.membership_role ||
                      role ||
                      'ORG_USER'}
                  </Text>
                </View>
              </View>
            </View>

            {/* =================================================
                TEAM
            ================================================= */}

            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionSmallTitle}>
                  PEOPLE
                </Text>

                <Text style={styles.sectionTitleNoMargin}>
                  Organisation Team
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.viewAllButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() =>
                  router.push(
                    '/organasation/team'
                  )
                }
              >
                <Text style={styles.viewAllText}>
                  VIEW TEAM
                </Text>

                <Text style={styles.viewAllArrow}>
                  →
                </Text>
              </Pressable>
            </View>

            {activeMembers.length === 0 ? (
              <EmptyState
                title="No active members"
                message="There are currently no active members assigned to this organisation."
              />
            ) : (
              <View style={styles.teamCard}>
                {activeMembers
                  .slice(0, 5)
                  .map((member, index) => {
                    const person =
                      memberProfiles[
                        member.user_id
                      ];

                    const name =
                      person?.full_name ||
                      'Organisation Member';

                    const isLastVisible =
                      index ===
                      Math.min(
                        activeMembers.length,
                        5
                      ) - 1;

                    return (
                      <View
                        key={member.id}
                        style={[
                          styles.teamRow,
                          isLastVisible &&
                            styles.teamRowLast,
                        ]}
                      >
                        <View
                          style={
                            styles.memberAvatar
                          }
                        >
                          <Text
                            style={
                              styles.memberAvatarText
                            }
                          >
                            {name
                              .charAt(0)
                              .toUpperCase()}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.memberDetails
                          }
                        >
                          <Text
                            style={
                              styles.memberName
                            }
                            numberOfLines={1}
                          >
                            {name}
                          </Text>

                          <Text
                            style={
                              styles.memberRole
                            }
                            numberOfLines={1}
                          >
                            {person?.job_title ||
                              member.membership_role}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.activeIndicator
                          }
                        >
                          <View
                            style={
                              styles.activeDot
                            }
                          />

                          <Text
                            style={
                              styles.activeText
                            }
                          >
                            ACTIVE
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                {activeMembers.length > 5 && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.moreMembersButton,
                      pressed &&
                        styles.buttonPressed,
                    ]}
                    onPress={() =>
                      router.push(
                        '/organasation/team'
                      )
                    }
                  >
                    <Text
                      style={
                        styles.moreMembersText
                      }
                    >
                      VIEW ALL{' '}
                      {activeMembers.length}{' '}
                      MEMBERS
                    </Text>

                    <Text
                      style={
                        styles.moreMembersArrow
                      }
                    >
                      →
                    </Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* =================================================
                TEAM MANAGEMENT
            ================================================= */}

            <View style={styles.addTeamSection}>
              <View style={styles.addTeamHeader}>
                <View
                  style={
                    styles.addTeamHeaderText
                  }
                >
                  <Text
                    style={
                      styles.sectionSmallTitle
                    }
                  >
                    TEAM MANAGEMENT
                  </Text>

                  <Text
                    style={
                      styles.sectionTitleNoMargin
                    }
                  >
                    Add Organisation Team
                  </Text>

                  <Text
                    style={
                      styles.addTeamSubtitle
                    }
                  >
                    Create and manage teams within
                    your organisation.
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.addTeamToggle,
                    pressed &&
                      styles.buttonPressed,
                  ]}
                  onPress={() =>
                    setShowAddTeamForm(
                      (previous) => !previous
                    )
                  }
                >
                  <Text
                    style={
                      styles.addTeamToggleIcon
                    }
                  >
                    {showAddTeamForm
                      ? '−'
                      : '+'}
                  </Text>

                  <Text
                    style={
                      styles.addTeamToggleText
                    }
                  >
                    {showAddTeamForm
                      ? 'CLOSE'
                      : 'ADD TEAM'}
                  </Text>
                </Pressable>
              </View>

              {showAddTeamForm && (
                <View style={styles.addTeamCard}>
                  <View
                    style={
                      styles.formNotice
                    }
                  >
                    <View
                      style={
                        styles.formNoticeAccent
                      }
                    />

                    <View
                      style={
                        styles.formNoticeContent
                      }
                    >
                      <Text
                        style={
                          styles.formNoticeTitle
                        }
                      >
                        TEAM REGISTRATION
                      </Text>

                      <Text
                        style={
                          styles.formNoticeText
                        }
                      >
                        Enter the official details for
                        the new organisation team.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>
                      TEAM NAME *
                    </Text>

                    <TextInput
                      style={styles.formInput}
                      value={teamName}
                      onChangeText={setTeamName}
                      placeholder="Enter team name"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>
                      TEAM DESCRIPTION
                    </Text>

                    <TextInput
                      style={[
                        styles.formInput,
                        styles.formTextArea,
                      ]}
                      value={teamDescription}
                      onChangeText={
                        setTeamDescription
                      }
                      placeholder="Describe the purpose of this team"
                      placeholderTextColor="#999999"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>
                      DEPARTMENT / FUNCTION
                    </Text>

                    <TextInput
                      style={styles.formInput}
                      value={teamDepartment}
                      onChangeText={
                        setTeamDepartment
                      }
                      placeholder="e.g. Finance, Administration, Programmes"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>
                      TEAM LEAD
                    </Text>

                    <TextInput
                      style={styles.formInput}
                      value={teamLead}
                      onChangeText={setTeamLead}
                      placeholder="Enter team lead name"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>
                      TEAM STATUS
                    </Text>

                    <View
                      style={
                        styles.statusOptions
                      }
                    >
                      <Pressable
                        style={[
                          styles.statusOption,
                          teamStatus ===
                            'ACTIVE' &&
                            styles.statusOptionActive,
                        ]}
                        onPress={() =>
                          setTeamStatus(
                            'ACTIVE'
                          )
                        }
                      >
                        <View
                          style={[
                            styles.statusOptionDot,
                            {
                              backgroundColor:
                                teamStatus ===
                                'ACTIVE'
                                  ? GOV.green
                                  : '#BBBBBB',
                            },
                          ]}
                        />

                        <Text
                          style={[
                            styles.statusOptionText,
                            teamStatus ===
                              'ACTIVE' &&
                              styles.statusOptionTextActive,
                          ]}
                        >
                          ACTIVE
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.statusOption,
                          teamStatus ===
                            'INACTIVE' &&
                            styles.statusOptionInactive,
                        ]}
                        onPress={() =>
                          setTeamStatus(
                            'INACTIVE'
                          )
                        }
                      >
                        <View
                          style={[
                            styles.statusOptionDot,
                            {
                              backgroundColor:
                                teamStatus ===
                                'INACTIVE'
                                  ? GOV.red
                                  : '#BBBBBB',
                            },
                          ]}
                        />

                        <Text
                          style={[
                            styles.statusOptionText,
                            teamStatus ===
                              'INACTIVE' &&
                              styles.statusOptionTextInactive,
                          ]}
                        >
                          INACTIVE
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View
                    style={styles.formActions}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.createTeamButton,
                        pressed &&
                          styles.buttonPressed,
                      ]}
                      onPress={
                        handleCreateTeam
                      }
                    >
                      <Text
                        style={
                          styles.createTeamButtonText
                        }
                      >
                        CREATE TEAM
                      </Text>

                      <Text
                        style={
                          styles.createTeamArrow
                        }
                      >
                        →
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.cancelTeamButton,
                        pressed &&
                          styles.buttonPressed,
                      ]}
                      onPress={
                        handleCancelTeam
                      }
                    >
                      <Text
                        style={
                          styles.cancelTeamButtonText
                        }
                      >
                        CANCEL
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* =================================================
                TEAM BREAKDOWN
            ================================================= */}

            <SectionHeader
              title="TEAM BREAKDOWN"
              subtitle="Current membership by category"
            />

            <View style={styles.breakdownCard}>
              <BreakdownRow
                label="Organisation Admins"
                value={activeAdmins.length}
              />

              <BreakdownRow
                label="Organisation Staff"
                value={activeStaff.length}
              />

              <BreakdownRow
                label="External Collaborators"
                value={
                  activeCollaborators.length
                }
              />

              <BreakdownRow
                label="Inactive / Suspended"
                value={inactiveMembers.length}
                last
              />
            </View>

            {/* =================================================
                WORKSPACE ACTIONS
            ================================================= */}

            <SectionHeader
              title="WORKSPACE ACTIONS"
              subtitle="Common organisation administration functions"
            />

            <View style={styles.actions}>
              <GovernmentAction
                number="01"
                title="Manage Team"
                description="Manage staff, collaborators and organisation membership."
                accent={GOV.green}
                onPress={
                  handleTeamQuickAccess
                }
              />

              <GovernmentAction
                number="02"
                title="Workspaces"
                description="Access cases, funding and organisation workspaces."
                accent={GOV.orange}
                onPress={() =>
                  handleComingSoon(
                    'Workspaces'
                  )
                }
              />

              <GovernmentAction
                number="03"
                title="Tasks"
                description="Track assignments and outstanding organisation activities."
                accent={GOV.blue}
                onPress={() =>
                  handleComingSoon('Tasks')
                }
              />

              <GovernmentAction
                number="04"
                title="Documents"
                description="Manage evidence, supporting documents and files."
                accent={GOV.red}
                onPress={() =>
                  handleComingSoon(
                    'Documents'
                  )
                }
              />

              <GovernmentAction
                number="05"
                title="Targets"
                description="Monitor organisational deliverables and targets."
                accent={GOV.green}
                onPress={() =>
                  handleComingSoon(
                    'Targets'
                  )
                }
              />

              <GovernmentAction
                number="06"
                title="Notifications"
                description="View organisation updates and system alerts."
                accent={GOV.orange}
                onPress={() =>
                  handleComingSoon(
                    'Notifications'
                  )
                }
              />
            </View>

            {/* =================================================
                ADMINISTRATION
            ================================================= */}

            {role === ROLES.ORG_ADMIN && (
              <>
                <SectionHeader
                  title="ADMINISTRATION"
                  subtitle="Organisation access management"
                />

                <View style={styles.adminCard}>
                  <View
                    style={styles.adminAccent}
                  />

                  <View
                    style={styles.adminContent}
                  >
                    <Text
                      style={styles.adminTitle}
                    >
                      Organisation Administration
                    </Text>

                    <Text
                      style={styles.adminText}
                    >
                      Manage your organisation's
                      staff, collaborators and
                      workspace access.
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.manageButton,
                      pressed &&
                        styles.buttonPressed,
                    ]}
                    onPress={
                      handleTeamQuickAccess
                    }
                  >
                    <Text
                      style={
                        styles.manageButtonText
                      }
                    >
                      MANAGE
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* =================================================
                NOTICE
            ================================================= */}

            <View style={styles.notice}>
              <View style={styles.noticeAccent} />

              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>
                  ADMINISTRATIVE INFORMATION
                </Text>

                <Text style={styles.noticeText}>
                  All organisation records and
                  activities within CIVITRACK should
                  be maintained in accordance with
                  applicable departmental policies,
                  funding requirements, financial
                  controls and records-management
                  requirements.
                </Text>
              </View>
            </View>
      

          {/* ==================================================
              FOOTER
          ================================================== */}

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

              <Text
                style={styles.footerDepartment}
              >
                Department of Sport, Arts and Culture
              </Text>

              <Text
                style={styles.footerRepublic}
              >
                REPUBLIC OF SOUTH AFRICA
              </Text>

              <Text style={styles.footerSystem}>
                CIVITRACK — Public Funding &
                Accountability Management System
              </Text>

              <View style={styles.footerLine} />

              <Text
                style={styles.footerCopyright}
              >
                © 2026 Department of Sport, Arts and Culture
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ProtectedRoute>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  title,
  subtitle,
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionOrangeBar} />

      <View>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   INFORMATION ROW
============================================================ */

function InfoRow({
  label,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.infoRow,
        last && styles.infoRowLast,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
   BREAKDOWN ROW
============================================================ */

function BreakdownRow({
  label,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.breakdownRow,
        last && styles.breakdownRowLast,
      ]}
    >
      <View
        style={styles.breakdownLabelContainer}
      >
        <View style={styles.breakdownBullet} />

        <Text style={styles.breakdownLabel}>
          {label}
        </Text>
      </View>

      <Text style={styles.breakdownValue}>
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
   GOVERNMENT ACTION
============================================================ */

function GovernmentAction({
  number,
  title,
  description,
  accent,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionCard,
        pressed && styles.actionPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.actionNumber,
          { backgroundColor: accent },
        ]}
      >
        <Text style={styles.actionNumberText}>
          {number}
        </Text>
      </View>

      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>
          {title}
        </Text>

        <Text style={styles.actionDescription}>
          {description}
        </Text>
      </View>

      <Text
        style={[
          styles.actionArrow,
          { color: accent },
        ]}
      >
        →
      </Text>
    </Pressable>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GOV.background,
  },

  container: {
    flex: 1,
    backgroundColor: GOV.background,
  },

  content: {
    flexGrow: 1,
  },

  /* ==========================================================
     FLAG
  ========================================================== */

  flagStrip: {
    height: 5,
    width: '100%',
    flexDirection: 'row',
  },

  flagRed: {
    flex: 1,
    backgroundColor: GOV.red,
  },

  flagWhite: {
    flex: 1,
    backgroundColor: GOV.white,
  },

  flagGreen: {
    flex: 2,
    backgroundColor: GOV.green,
  },

  flagGold: {
    flex: 1,
    backgroundColor: GOV.orange,
  },

  flagBlue: {
    flex: 1,
    backgroundColor: GOV.blue,
  },

  flagBlack: {
    flex: 1,
    backgroundColor: GOV.black,
  },

  /* ==========================================================
     GOVERNMENT HEADER
  ========================================================== */

  topHeader: {
    backgroundColor: GOV.white,
    minHeight: 150,
    paddingHorizontal: 7,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: GOV.borderLight,
  },

  topHeaderTablet: {
    paddingHorizontal: 20,
    minHeight: 125,
  },

  brandArea: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 350,
  },

  coatPlaceholder: {
    width: 92,
    height: 95,
    alignItems: 'center',
    justifyContent: 'center',
  },

  coatPlaceholderText: {
    color: GOV.green,
    fontSize: 24,
    fontWeight: '900',
    borderWidth: 2,
    borderColor: GOV.green,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  brandText: {
    marginLeft: 5,
  },

  brandTitle: {
    color: GOV.orange,
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
    color: GOV.orange,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  sloganLine: {
    width: 110,
    height: 2,
    backgroundColor: GOV.green,
    marginTop: 8,
  },

  userArea: {
    alignItems: 'flex-end',
    minWidth: 180,
    paddingRight: 20,
  },

  userSmall: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  userRole: {
    color: GOV.green,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'right',
  },

  userEmail: {
    maxWidth: 180,
    color: '#555555',
    fontSize: 9,
    marginTop: 3,
  },

  logoutButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: GOV.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  logoutPressed: {
    backgroundColor: '#FFF1E1',
  },

  logoutText: {
    color: GOV.orange,
    fontSize: 8,
    fontWeight: '900',
  },

  /* ==========================================================
     SYSTEM BAR
  ========================================================== */

  systemBar: {
    backgroundColor: GOV.white,
    minHeight: 74,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: GOV.border,
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
    borderColor: GOV.border,
  },

  miniRed: {
    flex: 1,
    backgroundColor: GOV.red,
  },

  miniGreen: {
    flex: 1,
    backgroundColor: GOV.green,
  },

  miniBlue: {
    flex: 1,
    backgroundColor: GOV.blue,
  },

  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: GOV.green,
    paddingLeft: 10,
  },

  systemStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOV.green,
    marginRight: 8,
  },

  statusLabel: {
    color: '#888888',
    fontSize: 7,
    fontWeight: '800',
  },

  statusValue: {
    color: GOV.green,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  navigation: {
    backgroundColor: GOV.orange,
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

  navPressed: {
    backgroundColor: GOV.orangeDark,
  },

  navActive: {
    paddingHorizontal: 18,
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: GOV.orangeDark,
    borderBottomWidth: 4,
    borderBottomColor: GOV.green,
  },

  navText: {
    color: GOV.white,
    fontSize: 10,
    fontWeight: '900',
  },

  navActiveText: {
    color: GOV.white,
    fontSize: 10,
    fontWeight: '900',
  },

  /* ==========================================================
     MAIN
  ========================================================== */

  main: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
    paddingHorizontal: 34,
    paddingVertical: 28,
  },

  mainTablet: {
    paddingHorizontal: 22,
  },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  breadcrumbHome: {
    color: GOV.orange,
    fontSize: 8,
    fontWeight: '900',
  },

  breadcrumbSlash: {
    color: '#AAAAAA',
    fontSize: 9,
    marginHorizontal: 8,
  },

  breadcrumbCurrent: {
    color: '#666666',
    fontSize: 8,
    fontWeight: '800',
  },

  /* ==========================================================
     PAGE HEADER
  ========================================================== */

  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    width: 45,
    height: 4,
    backgroundColor: GOV.orange,
    marginBottom: 10,
  },

  pageTitle: {
    color: '#222222',
    fontSize: 27,
    fontWeight: '900',
  },

  pageDescription: {
    color: '#666666',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
    maxWidth: 760,
  },

  financialYear: {
    minWidth: 160,
    backgroundColor: GOV.white,
    borderTopWidth: 4,
    borderTopColor: GOV.green,
    borderWidth: 1,
    borderColor: GOV.border,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },

  financialLabel: {
    color: '#888888',
    fontSize: 7,
    fontWeight: '900',
  },

  financialValue: {
    color: '#222222',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },

  /* ==========================================================
     SECTIONS
  ========================================================== */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
    marginTop: 5,
  },

  sectionOrangeBar: {
    width: 5,
    height: 30,
    backgroundColor: GOV.orange,
    marginRight: 10,
  },

  sectionTitle: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  sectionSubtitle: {
    color: '#888888',
    fontSize: 9,
    marginTop: 3,
  },

  sectionSmallTitle: {
    color: GOV.orange,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  sectionTitleNoMargin: {
    color: '#222222',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },

  sectionHeaderRow: {
    marginTop: 5,
    marginBottom: 13,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  /* ==========================================================
     STATISTICS
  ========================================================== */

  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 32,
  },

  statCard: {
    flex: 1,
    minWidth: 210,
    minHeight: 145,
    margin: 6,
    padding: 19,
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    position: 'relative',
    overflow: 'hidden',
  },

  statAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },

  statLabel: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 3,
  },

  statNumber: {
    color: '#222222',
    fontSize: 35,
    fontWeight: '900',
    marginTop: 12,
  },

  statDescription: {
    color: '#777777',
    fontSize: 9,
    marginTop: 3,
  },

  statBottomAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 55,
    height: 3,
  },

  /* ==========================================================
     STATUS
  ========================================================== */

  statusCard: {
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    minHeight: 105,
    padding: 20,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  statusCardContent: {
    flex: 1,
    paddingRight: 20,
  },

  statusCardLabel: {
    color: '#888888',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  statusOrganisationName: {
    color: '#222222',
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },

  statusDescription: {
    color: '#777777',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 5,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  statusPillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },

  statusPillText: {
    fontSize: 8,
    fontWeight: '900',
  },

  /* ==========================================================
     INFORMATION
  ========================================================== */

  infoCard: {
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    paddingHorizontal: 20,
    marginBottom: 32,
  },

  infoRow: {
    minHeight: 58,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GOV.borderLight,
    justifyContent: 'center',
  },

  infoRowLast: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  infoValue: {
    color: '#222222',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 5,
  },

  /* ==========================================================
     ACCOUNT
  ========================================================== */

  accountCard: {
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    padding: 20,
    marginBottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
  },

  accountAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: GOV.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accountAvatarText: {
    fontSize: 22,
    fontWeight: '900',
    color: GOV.white,
  },

  accountDetails: {
    flex: 1,
    marginLeft: 15,
  },

  accountName: {
    color: '#222222',
    fontSize: 14,
    fontWeight: '900',
  },

  accountEmail: {
    color: '#777777',
    fontSize: 9,
    marginTop: 4,
  },

  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#EAF2FA',
    borderWidth: 1,
    borderColor: '#D5E2ED',
  },

  rolePillText: {
    color: GOV.blue,
    fontSize: 8,
    fontWeight: '900',
  },

  /* ==========================================================
     TEAM
  ========================================================== */

  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: '#FFF1E1',
    borderWidth: 1,
    borderColor: '#F6D5AA',
  },

  viewAllText: {
    color: GOV.orange,
    fontSize: 8,
    fontWeight: '900',
  },

  viewAllArrow: {
    color: GOV.orange,
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 5,
  },

  teamCard: {
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    overflow: 'hidden',
    marginBottom: 20,
  },

  teamRow: {
    minHeight: 74,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GOV.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  teamRowLast: {
    borderBottomWidth: 0,
  },

  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF2FA',
    borderWidth: 1,
    borderColor: '#D5E2ED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  memberAvatarText: {
    color: GOV.blue,
    fontSize: 14,
    fontWeight: '900',
  },

  memberDetails: {
    flex: 1,
    marginLeft: 14,
  },

  memberName: {
    color: '#222222',
    fontSize: 10,
    fontWeight: '900',
  },

  memberRole: {
    color: '#777777',
    fontSize: 8,
    marginTop: 4,
  },

  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#E6F4EF',
  },

  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: GOV.green,
    marginRight: 5,
  },

  activeText: {
    color: GOV.green,
    fontSize: 7,
    fontWeight: '900',
  },

  moreMembersButton: {
    minHeight: 48,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#EAF2FA',
  },

  moreMembersText: {
    color: GOV.blue,
    fontSize: 8,
    fontWeight: '900',
  },

  moreMembersArrow: {
    color: GOV.blue,
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 5,
  },

  /* ==========================================================
     TEAM MANAGEMENT
  ========================================================== */

  addTeamSection: {
    marginBottom: 32,
  },

  addTeamHeader: {
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  addTeamHeaderText: {
    flex: 1,
    paddingRight: 15,
  },

  addTeamSubtitle: {
    color: '#777777',
    fontSize: 9,
    marginTop: 5,
  },

  addTeamToggle: {
    minHeight: 38,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: GOV.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addTeamToggleIcon: {
    color: GOV.white,
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
    lineHeight: 18,
  },

  addTeamToggleText: {
    color: GOV.white,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  addTeamCard: {
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: GOV.border,
    padding: 22,
  },

  formNotice: {
    flexDirection: 'row',
    backgroundColor: '#F5F8FB',
    borderWidth: 1,
    borderColor: '#D5E2ED',
    marginBottom: 22,
  },

  formNoticeAccent: {
    width: 5,
    backgroundColor: GOV.blue,
  },

  formNoticeContent: {
    flex: 1,
    padding: 13,
  },

  formNoticeTitle: {
    color: GOV.blue,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  formNoticeText: {
    color: '#777777',
    fontSize: 9,
    marginTop: 4,
    lineHeight: 14,
  },

  formField: {
    marginBottom: 17,
  },

  formLabel: {
    color: '#555555',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 7,
  },

  formInput: {
    minHeight: 46,
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: '#222222',
    fontSize: 10,
  },

  formTextArea: {
    minHeight: 100,
    paddingTop: 12,
  },

  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  statusOption: {
    minHeight: 42,
    minWidth: 125,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: GOV.border,
    backgroundColor: GOV.white,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusOptionActive: {
    backgroundColor: '#E6F4EF',
    borderColor: GOV.green,
  },

  statusOptionInactive: {
    backgroundColor: '#FDEBE7',
    borderColor: GOV.red,
  },

  statusOptionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },

  statusOptionText: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '900',
  },

  statusOptionTextActive: {
    color: GOV.green,
  },

  statusOptionTextInactive: {
    color: GOV.red,
  },

  formActions: {
    marginTop: 5,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: GOV.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  createTeamButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    backgroundColor: GOV.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createTeamButtonText: {
    color: GOV.white,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  createTeamArrow: {
    color: GOV.white,
    fontSize: 17,
    fontWeight: '900',
    marginLeft: 8,
  },

  cancelTeamButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: GOV.border,
    backgroundColor: GOV.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelTeamButtonText: {
    color: '#777777',
    fontSize: 8,
    fontWeight: '900',
  },

  /* ==========================================================
     BREAKDOWN
  ========================================================== */

  breakdownCard: {
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    paddingHorizontal: 20,
    marginBottom: 32,
  },

  breakdownRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: GOV.borderLight,
  },

  breakdownRowLast: {
    borderBottomWidth: 0,
  },

  breakdownLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  breakdownBullet: {
    width: 7,
    height: 7,
    marginRight: 9,
    backgroundColor: GOV.orange,
  },

  breakdownLabel: {
    color: '#777777',
    fontSize: 9,
  },

  breakdownValue: {
    minWidth: 36,
    textAlign: 'right',
    color: GOV.green,
    fontSize: 14,
    fontWeight: '900',
  },

  /* ==========================================================
     ACTIONS
  ========================================================== */

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 32,
  },

  actionCard: {
    flex: 1,
    minWidth: 280,
    minHeight: 105,
    margin: 6,
    padding: 17,
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionPressed: {
    backgroundColor: '#FFF8F0',
  },

  actionNumber: {
    width: 43,
    height: 43,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionNumberText: {
    color: GOV.white,
    fontSize: 10,
    fontWeight: '900',
  },

  actionContent: {
    flex: 1,
    marginLeft: 13,
  },

  actionTitle: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '900',
  },

  actionDescription: {
    color: '#777777',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 5,
  },

  actionArrow: {
    fontSize: 21,
    fontWeight: '900',
    marginLeft: 8,
  },

  /* ==========================================================
     ADMINISTRATION
  ========================================================== */

  adminCard: {
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    minHeight: 100,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden',
  },

  adminAccent: {
    width: 6,
    height: '100%',
    backgroundColor: GOV.green,
  },

  adminContent: {
    flex: 1,
    padding: 18,
  },

  adminTitle: {
    color: '#222222',
    fontSize: 12,
    fontWeight: '900',
  },

  adminText: {
    color: '#777777',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 5,
  },

  manageButton: {
    marginRight: 18,
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: GOV.green,
  },

  manageButtonText: {
    color: GOV.white,
    fontSize: 8,
    fontWeight: '900',
  },

  /* ==========================================================
     NOTICE
  ========================================================== */

  notice: {
    backgroundColor: GOV.white,
    borderWidth: 1,
    borderColor: GOV.border,
    flexDirection: 'row',
    marginBottom: 10,
  },

  noticeAccent: {
    width: 6,
    backgroundColor: GOV.orange,
  },

  noticeContent: {
    padding: 18,
    flex: 1,
  },

  noticeTitle: {
    color: '#333333',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  noticeText: {
    color: '#777777',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 5,
  },

  /* ==========================================================
     BUTTONS
  ========================================================== */

  buttonPressed: {
    opacity: 0.7,
  },

  primaryButton: {
    marginTop: 25,
    width: '100%',
    minHeight: 50,
    backgroundColor: GOV.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  primaryButtonText: {
    color: GOV.white,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  secondaryButton: {
    marginTop: 12,
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderColor: GOV.orange,
    backgroundColor: GOV.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  secondaryButtonText: {
    color: GOV.orange,
    fontSize: 9,
    fontWeight: '900',
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    backgroundColor: GOV.white,
    borderTopWidth: 5,
    borderTopColor: GOV.orange,
    paddingVertical: 30,
    alignItems: 'center',
  },

  footerFlag: {
    height: 4,
    width: 180,
    flexDirection: 'row',
    marginBottom: 18,
  },

  footerRed: {
    flex: 1,
    backgroundColor: GOV.red,
  },

  footerGreen: {
    flex: 2,
    backgroundColor: GOV.green,
  },

  footerBlue: {
    flex: 1,
    backgroundColor: GOV.blue,
  },

  footerGold: {
    flex: 1,
    backgroundColor: GOV.orange,
  },

  footerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  footerTitle: {
    color: GOV.orange,
    fontSize: 15,
    fontWeight: '600',
  },

  footerDepartment: {
    color: '#333333',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },

  footerRepublic: {
    color: '#333333',
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
    width: 80,
    height: 2,
    backgroundColor: GOV.green,
    marginVertical: 13,
  },

  footerCopyright: {
    color: '#999999',
    fontSize: 8,
  },

  /* ==========================================================
     LOADING
  ========================================================== */

  loadingFlagStrip: {
    height: 5,
    width: '100%',
    flexDirection: 'row',
  },

  loadingHeader: {
    minHeight: 120,
    paddingHorizontal: 25,
    backgroundColor: GOV.white,
    borderBottomWidth: 1,
    borderBottomColor: GOV.border,
    justifyContent: 'center',
  },

  loadingBrand: {
    alignItems: 'flex-start',
  },

  loadingBrandTitle: {
    color: GOV.orange,
    fontSize: 21,
    fontWeight: '500',
  },

  loadingDepartment: {
    color: '#333333',
    fontSize: 10,
    marginTop: 3,
  },

  loadingRepublic: {
    color: '#333333',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },

  loadingSystemBar: {
    paddingHorizontal: 25,
    paddingVertical: 15,
    backgroundColor: GOV.white,
    borderBottomWidth: 1,
    borderBottomColor: GOV.border,
  },

  loadingSystemName: {
    color: '#222222',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },

  loadingSystemDescription: {
    color: '#777777',
    fontSize: 9,
    marginTop: 2,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingTitle: {
    marginTop: 18,
    color: '#222222',
    fontSize: 16,
    fontWeight: '900',
  },

  loadingText: {
    marginTop: 7,
    color: '#777777',
    fontSize: 10,
    textAlign: 'center',
  },

  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  emptyHeader: {
    minHeight: 125,
    paddingHorizontal: 25,
    paddingVertical: 18,
    backgroundColor: GOV.white,
    borderBottomWidth: 1,
    borderBottomColor: GOV.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  emptyHeaderBrand: {
    color: GOV.orange,
    fontSize: 21,
    fontWeight: '500',
  },

  emptyHeaderDepartment: {
    color: '#333333',
    fontSize: 10,
    marginTop: 3,
  },

  emptyHeaderRepublic: {
    color: '#333333',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
  },

  emptyHeaderSystem: {
    color: '#222222',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },

  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },

  emptyAccent: {
    width: 45,
    height: 4,
    backgroundColor: GOV.orange,
    marginBottom: 15,
  },

  emptyEyebrow: {
    color: GOV.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  emptyTitle: {
    color: '#222222',
    fontSize: 23,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 7,
  },

  emptyText: {
    maxWidth: 600,
    color: '#777777',
    fontSize: 11,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 12,
  },
});