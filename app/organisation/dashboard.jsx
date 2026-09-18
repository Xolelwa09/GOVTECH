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
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import ProtectedRoute from '../../src/components/ProtectedRoute';
import { EmptyState } from '../../src/components/EmptyState';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { ROLES } from '../../src/constants/roles';

import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SHADOWS,
} from '../../src/constants/theme';

const StatCard = ({ title, value, icon }) => (
  <View style={localStatCardStyles.card}>
    <View style={localStatCardStyles.iconContainer}>
      <Text style={localStatCardStyles.icon}>{icon}</Text>
    </View>

    <Text style={localStatCardStyles.value}>{value}</Text>

    <Text
      style={localStatCardStyles.title}
      numberOfLines={1}
    >
      {title}
    </Text>
  </View>
);

const localStatCardStyles = StyleSheet.create({
  card: {
    minHeight: 125,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },

  icon: {
    fontSize: FONT_SIZES.md,
  },

  value: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },

  title: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});

export default function OrganisationDashboardScreen() {
  const {
    user,
    profile,
    role,
    loading: authLoading,
    signOut,
  } = useAuth();

  const [organisation, setOrganisation] = useState(null);
  const [membership, setMembership] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ====================================================
  // LOAD DASHBOARD
  // ====================================================

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

        // ----------------------------------------------
        // 1. CURRENT USER MEMBERSHIP
        // ----------------------------------------------

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

          throw new Error(membershipError.message);
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

        console.log(
          'ORGANISATION DASHBOARD: membership found',
          currentMembership
        );

        setMembership(currentMembership);

        const organisationId =
          currentMembership.organisation_id;

        // ----------------------------------------------
        // 2. ORGANISATION
        // ----------------------------------------------

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

          throw new Error(organisationError.message);
        }

        if (!organisationData) {
          setOrganisation(null);

          throw new Error(
            'The organisation linked to your account could not be found.'
          );
        }

        console.log(
          'ORGANISATION DASHBOARD: organisation found',
          organisationData
        );

        setOrganisation(organisationData);

        // ----------------------------------------------
        // 3. ALL ORGANISATION MEMBERS
        // ----------------------------------------------

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
          .eq('organisation_id', organisationId)
          .order('created_at', {
            ascending: false,
          });

        if (membershipsError) {
          console.error(
            'ORGANISATION DASHBOARD: members error',
            membershipsError
          );

          throw new Error(membershipsError.message);
        }

        const organisationMembers = membershipsData || [];

        setMembers(organisationMembers);

        // ----------------------------------------------
        // 4. MEMBER PROFILES
        // ----------------------------------------------

        const memberUserIds = organisationMembers.map(
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

            throw new Error(profilesError.message);
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

  // ====================================================
  // REFRESH WHEN SCREEN OPENS
  // ====================================================

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  // ====================================================
  // REFRESH
  // ====================================================

  const handleRefresh = () => {
    loadDashboard(true);
  };

  // ====================================================
  // SIGN OUT
  // ====================================================

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

  // ====================================================
  // FUTURE MODULE
  // ====================================================

  const handleComingSoon = (sectionName) => {
    Alert.alert(
      sectionName,
      `${sectionName} is connected to the CIVITRACK organisation portal. This module will become available as the workflow database is completed.`
    );
  };

  // ====================================================
  // STATISTICS
  // ====================================================

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

  const activeCollaborators = activeMembers.filter(
    (item) =>
      item.membership_role === 'EXTERNAL_COLLABORATOR'
  );

  const inactiveMembers = members.filter(
    (item) => item.status !== 'ACTIVE'
  );

  const currentUserProfile = profile;

  const displayName =
    currentUserProfile?.full_name ||
    currentUserProfile?.email ||
    'Organisation Admin';

  // ====================================================
  // HELPERS
  // ====================================================

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
          backgroundColor: COLORS.successLight,
          color: COLORS.success,
        };

      case 'SUSPENDED':
        return {
          backgroundColor: COLORS.warningLight,
          color: COLORS.warning,
        };

      case 'INACTIVE':
        return {
          backgroundColor: COLORS.dangerLight,
          color: COLORS.danger,
        };

      default:
        return {
          backgroundColor: COLORS.primaryLight,
          color: COLORS.primary,
        };
    }
  };

  // ====================================================
  // LOADING
  // ====================================================

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
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

  // ====================================================
  // NO ORGANISATION
  // ====================================================

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
            backgroundColor={COLORS.background}
          />

          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.primary}
              />
            }
          >
            <View style={styles.emptyLogo}>
              <Text style={styles.emptyLogoText}>
                C
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              Organisation Not Found
            </Text>

            <Text style={styles.emptyText}>
              {error ||
                'Your account has not been assigned to an active organisation.'}
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={handleRefresh}
            >
              <Text style={styles.primaryButtonText}>
                Refresh
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={handleSignOut}
            >
              <Text style={styles.secondaryButtonText}>
                Sign Out
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

  // ====================================================
  // MAIN DASHBOARD
  // ====================================================

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
          backgroundColor={COLORS.background}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}

          <View style={styles.dashboardHeader}>
            <View style={styles.dashboardHeaderContent}>
              <Text style={styles.dashboardHeaderTitle}>
                CIVITRACK
              </Text>

              <Text style={styles.dashboardHeaderSubtitle}>
                Organisation Portal
              </Text>
            </View>

            <View style={styles.headerLogo}>
              <Text style={styles.headerLogoText}>
                C
              </Text>
            </View>
          </View>

          {/* WELCOME CARD */}

          <View style={styles.welcomeCard}>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeEyebrow}>
                WELCOME BACK
              </Text>

              <Text
                style={styles.welcomeTitle}
                numberOfLines={1}
              >
                {displayName}
              </Text>

              <Text style={styles.welcomeSubtitle}>
                {role === ROLES.ORG_ADMIN
                  ? 'Organisation Administrator'
                  : 'Organisation Staff'}
              </Text>

              <View style={styles.organisationBadge}>
                <View style={styles.badgeDot} />

                <Text
                  style={styles.organisationBadgeText}
                  numberOfLines={1}
                >
                  {organisation.name}
                </Text>
              </View>
            </View>

            <View style={styles.welcomeIcon}>
              <Text style={styles.welcomeIconText}>
                C
              </Text>
            </View>
          </View>

          {/* ORGANISATION OVERVIEW */}

          <Text style={styles.sectionTitle}>
            Organisation Overview
          </Text>

          <View style={styles.statsGrid}>
            <View style={styles.statWrapper}>
              <StatCard
                title="Team Members"
                value={String(members.length)}
                icon="👥"
              />
            </View>

            <View style={styles.statWrapper}>
              <StatCard
                title="Active Members"
                value={String(activeMembers.length)}
                icon="✓"
              />
            </View>

            <View style={styles.statWrapper}>
              <StatCard
                title="Staff"
                value={String(activeStaff.length)}
                icon="◉"
              />
            </View>

            <View style={styles.statWrapper}>
              <StatCard
                title="Collaborators"
                value={String(activeCollaborators.length)}
                icon="◇"
              />
            </View>
          </View>

          {/* STATUS */}

          <View style={styles.statusCard}>
            <View style={styles.statusCardLeft}>
              <Text style={styles.statusLabel}>
                ORGANISATION STATUS
              </Text>

              <Text style={styles.statusOrganisationName}>
                {organisation.name}
              </Text>

              <Text style={styles.statusDescription}>
                Your organisation workspace is currently
                connected to CIVITRACK.
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
                  styles.statusDot,
                  {
                    backgroundColor: statusStyle.color,
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

          {/* ORGANISATION INFORMATION */}

          <Text style={styles.sectionTitle}>
            Organisation Information
          </Text>

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

          {/* ACCOUNT */}

          <Text style={styles.sectionTitle}>
            Your Account
          </Text>

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

          {/* TEAM */}

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleNoMargin}>
              Team
            </Text>

            <Pressable
              onPress={() =>
                router.push('/organasation/team')
              }
            >
              <Text style={styles.viewAllText}>
                View Team
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
                    memberProfiles[member.user_id];

                  const name =
                    person?.full_name ||
                    'Organisation Member';

                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.teamRow,
                        index ===
                        Math.min(
                          activeMembers.length,
                          5
                        ) - 1
                          ? styles.teamRowLast
                          : null,
                      ]}
                    >
                      <View style={styles.memberAvatar}>
                        <Text
                          style={styles.memberAvatarText}
                        >
                          {name
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      </View>

                      <View style={styles.memberDetails}>
                        <Text
                          style={styles.memberName}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>

                        <Text
                          style={styles.memberRole}
                          numberOfLines={1}
                        >
                          {person?.job_title ||
                            member.membership_role}
                        </Text>
                      </View>

                      <View style={styles.activeIndicator}>
                        <View style={styles.activeDot} />

                        <Text style={styles.activeText}>
                          Active
                        </Text>
                      </View>
                    </View>
                  );
                })}

              {activeMembers.length > 5 && (
                <Pressable
                  style={styles.moreMembersButton}
                  onPress={() =>
                    router.push('/organasation/team')
                  }
                >
                  <Text style={styles.moreMembersText}>
                    View all {activeMembers.length} members
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {/* TEAM BREAKDOWN */}

          <Text style={styles.sectionTitle}>
            Team Breakdown
          </Text>

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
              value={activeCollaborators.length}
            />

            <BreakdownRow
              label="Inactive / Suspended"
              value={inactiveMembers.length}
              last
            />
          </View>

          {/* QUICK ACTIONS */}

          <Text style={styles.sectionTitle}>
            Quick Actions
          </Text>

          <View style={styles.actionsGrid}>
            <ActionButton
              title="Manage Team"
              subtitle="Staff & collaborators"
              icon="👥"
              onPress={() =>
                router.push('/organasation/team')
              }
            />

            <ActionButton
              title="Workspaces"
              subtitle="Cases & funding"
              icon="▣"
              onPress={() =>
                handleComingSoon('Workspaces')
              }
            />

            <ActionButton
              title="Tasks"
              subtitle="Track assignments"
              icon="✓"
              onPress={() =>
                handleComingSoon('Tasks')
              }
            />

            <ActionButton
              title="Documents"
              subtitle="Evidence & files"
              icon="▤"
              onPress={() =>
                handleComingSoon('Documents')
              }
            />

            <ActionButton
              title="Targets"
              subtitle="Track deliverables"
              icon="◎"
              onPress={() =>
                handleComingSoon('Targets')
              }
            />

            <ActionButton
              title="Notifications"
              subtitle="Updates & alerts"
              icon="◌"
              onPress={() =>
                handleComingSoon('Notifications')
              }
            />
          </View>

          {/* ADMINISTRATION */}

          {role === ROLES.ORG_ADMIN && (
            <>
              <Text style={styles.sectionTitle}>
                Administration
              </Text>

              <View style={styles.adminCard}>
                <View style={styles.adminIcon}>
                  <Text style={styles.adminIconText}>
                    ⚙
                  </Text>
                </View>

                <View style={styles.adminContent}>
                  <Text style={styles.adminTitle}>
                    Organisation Administration
                  </Text>

                  <Text style={styles.adminText}>
                    Manage your organisation's staff,
                    collaborators and workspace access.
                  </Text>
                </View>

                <Pressable
                  style={styles.manageButton}
                  onPress={() =>
                    router.push('/organasation/team')
                  }
                >
                  <Text style={styles.manageButtonText}>
                    Manage
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* SIGN OUT */}

          <Pressable
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>
              Sign Out
            </Text>
          </Pressable>

          {/* FOOTER */}

          <View style={styles.footer}>
            <Text style={styles.footerBrand}>
              CIVITRACK
            </Text>

            <Text style={styles.footerText}>
              Public Funding & Accountability Platform
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ProtectedRoute>
  );
}

// ======================================================
// INFORMATION ROW
// ======================================================

function InfoRow({
  label,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.infoRow,
        last ? styles.infoRowLast : null,
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

// ======================================================
// BREAKDOWN ROW
// ======================================================

function BreakdownRow({
  label,
  value,
  last = false,
}) {
  return (
    <View
      style={[
        styles.breakdownRow,
        last ? styles.breakdownRowLast : null,
      ]}
    >
      <Text style={styles.breakdownLabel}>
        {label}
      </Text>

      <Text style={styles.breakdownValue}>
        {value}
      </Text>
    </View>
  );
}

// ======================================================
// ACTION BUTTON
// ======================================================

function ActionButton({
  title,
  subtitle,
  icon,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionButton,
        pressed
          ? styles.actionButtonPressed
          : null,
      ]}
      onPress={onPress}
    >
      <View style={styles.actionIcon}>
        <Text style={styles.actionIconText}>
          {icon}
        </Text>
      </View>

      <View style={styles.actionContent}>
        <Text style={styles.actionTitle}>
          {title}
        </Text>

        <Text style={styles.actionSubtitle}>
          {subtitle}
        </Text>
      </View>

      <Text style={styles.actionArrow}>
        ›
      </Text>
    </Pressable>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  // HEADER

  dashboardHeader: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dashboardHeaderContent: {
    flex: 1,
  },

  dashboardHeaderTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.extraBold,
    letterSpacing: 1.2,
    color: COLORS.primary,
  },

  dashboardHeaderSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  headerLogo: {
    width: 46,
    height: 46,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerLogoText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.extraBold,
    color: COLORS.textWhite,
  },

  // LOADING

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },

  loadingTitle: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },

  loadingText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // EMPTY

  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },

  emptyLogo: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },

  emptyLogoText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.extraBold,
    color: COLORS.textWhite,
  },

  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
    textAlign: 'center',
  },

  emptyText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  primaryButton: {
    marginTop: SPACING.xl,
    width: '100%',
    minHeight: 50,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },

  primaryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textWhite,
  },

  secondaryButton: {
    marginTop: SPACING.md,
    width: '100%',
    minHeight: 50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },

  secondaryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },

  // WELCOME

  welcomeCard: {
    marginTop: SPACING.md,
    minHeight: 175,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    ...SHADOWS.medium,
  },

  welcomeContent: {
    flex: 1,
    paddingRight: SPACING.md,
  },

  welcomeEyebrow: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 1.2,
    color: COLORS.gold,
  },

  welcomeTitle: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textWhite,
  },

  welcomeSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.75)',
  },

  organisationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },

  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: COLORS.gold,
    marginRight: SPACING.sm,
  },

  organisationBadgeText: {
    maxWidth: 210,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textWhite,
  },

  welcomeIcon: {
    width: 65,
    height: 65,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  welcomeIconText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.extraBold,
    color: COLORS.primary,
  },

  // SECTION

  sectionTitle: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },

  sectionTitleNoMargin: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.text,
  },

  sectionHeaderRow: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  viewAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },

  // STATS

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.sm,
  },

  statWrapper: {
    width: '50%',
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.md,
  },

  // STATUS

  statusCard: {
    marginTop: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.small,
  },

  statusCardLeft: {
    flex: 1,
    paddingRight: SPACING.md,
  },

  statusLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    letterSpacing: 0.8,
    color: COLORS.textSecondary,
  },

  statusOrganisationName: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },

  statusDescription: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    marginRight: SPACING.xs,
  },

  statusPillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },

  // INFORMATION

  infoCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.small,
  },

  infoRow: {
    minHeight: 58,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    justifyContent: 'center',
  },

  infoRowLast: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },

  infoValue: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.text,
  },

  // ACCOUNT

  accountCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },

  accountAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accountAvatarText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },

  accountDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },

  accountName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },

  accountEmail: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  rolePill: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.secondaryLight,
  },

  rolePillText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.secondary,
  },

  // TEAM

  teamCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SHADOWS.small,
  },

  teamRow: {
    minHeight: 72,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
  },

  teamRowLast: {
    borderBottomWidth: 0,
  },

  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  memberAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },

  memberDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },

  memberName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },

  memberRole: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },

  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: COLORS.success,
    marginRight: SPACING.xs,
  },

  activeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.success,
  },

  moreMembersButton: {
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },

  moreMembersText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },

  // BREAKDOWN

  breakdownCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.small,
  },

  breakdownRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  breakdownRowLast: {
    borderBottomWidth: 0,
  },

  breakdownLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },

  breakdownValue: {
    minWidth: 36,
    textAlign: 'right',
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.primary,
  },

  // ACTIONS

  actionsGrid: {
    gap: SPACING.md,
  },

  actionButton: {
    minHeight: 76,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },

  actionButtonPressed: {
    opacity: 0.75,
  },

  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionIconText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.primary,
  },

  actionContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },

  actionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },

  actionSubtitle: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },

  actionArrow: {
    marginLeft: SPACING.sm,
    fontSize: 28,
    fontWeight: FONT_WEIGHTS.regular,
    color: COLORS.textLight,
  },

  // ADMIN

  adminCard: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: '#D5E2ED',
    flexDirection: 'row',
    alignItems: 'center',
  },

  adminIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  adminIconText: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textWhite,
  },

  adminContent: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },

  adminTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },

  adminText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  manageButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
  },

  manageButtonText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textWhite,
  },

  // SIGN OUT

  signOutButton: {
    marginTop: SPACING.xxl,
    minHeight: 50,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  signOutButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.danger,
  },

  // FOOTER

  footer: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
  },

  footerBrand: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.extraBold,
    letterSpacing: 1.5,
    color: COLORS.primary,
  },

  footerText: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});