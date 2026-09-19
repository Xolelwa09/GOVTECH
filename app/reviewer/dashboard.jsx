
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
import { useAuth } from '../../src/contexts/AuthContext';
import { ROLES } from '../../src/constants/roles';
import { supabase } from '../../src/services/supabase';

const COLORS = {
  navy: '#003B5C',
  blue: '#0053A1',
  green: '#009366',
  orange: '#F7941D',
  red: '#F05D2A',
  white: '#FFFFFF',
  background: '#F4F7FA',
  border: '#D9E2EA',
  text: '#17324D',
  muted: '#66788A',
  lightBlue: '#EAF3FB',
  lightGreen: '#EAF7F2',
  lightOrange: '#FFF4E4',
  lightRed: '#FDEDEA',
};

const ACTIONABLE_STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'VERIFICATION',
  'DECISION',
  'RETURNED',
];

const STATUS_LABELS = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  VERIFICATION: 'Verification',
  DECISION: 'Decision',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  RETURNED: 'Returned',
};

function formatDate(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount, currency) {
  if (amount === null || amount === undefined) {
    return '—';
  }

  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return String(amount);
  }

  return `${currency || 'ZAR'} ${numericAmount.toLocaleString(
    'en-ZA',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function getStatusStyle(status) {
  switch (status) {
    case 'SUBMITTED':
      return {
        backgroundColor: COLORS.lightOrange,
        color: '#A85A00',
      };

    case 'UNDER_REVIEW':
      return {
        backgroundColor: COLORS.lightBlue,
        color: COLORS.blue,
      };

    case 'VERIFICATION':
      return {
        backgroundColor: '#F0EBFF',
        color: '#6547A5',
      };

    case 'DECISION':
      return {
        backgroundColor: '#FFF0D7',
        color: '#9B5C00',
      };

    case 'RETURNED':
      return {
        backgroundColor: COLORS.lightRed,
        color: COLORS.red,
      };

    case 'COMPLETED':
      return {
        backgroundColor: COLORS.lightGreen,
        color: COLORS.green,
      };

    case 'REJECTED':
      return {
        backgroundColor: COLORS.lightRed,
        color: COLORS.red,
      };

    default:
      return {
        backgroundColor: '#EEF2F5',
        color: COLORS.muted,
      };
  }
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor: `${color}15`,
          },
        ]}
      >
        <Text
          style={[
            styles.statIconText,
            {
              color,
            },
          ]}
        >
          {icon}
        </Text>
      </View>

      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>

        <Text style={styles.statValue}>
          {value}
        </Text>

        <Text style={styles.statSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function WorkspaceCard({
  title,
  description,
  count,
  icon,
  color,
  onPress,
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.workspaceCard,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.workspaceIcon,
          {
            backgroundColor: `${color}15`,
          },
        ]}
      >
        <Text
          style={[
            styles.workspaceIconText,
            {
              color,
            },
          ]}
        >
          {icon}
        </Text>
      </View>

      <View style={styles.workspaceContent}>
        <View style={styles.workspaceTitleRow}>
          <Text style={styles.workspaceTitle}>
            {title}
          </Text>

          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: color,
              },
            ]}
          >
            <Text style={styles.countBadgeText}>
              {count}
            </Text>
          </View>
        </View>

        <Text style={styles.workspaceDescription}>
          {description}
        </Text>

        <View style={styles.workspaceAction}>
          <Text
            style={[
              styles.workspaceActionText,
              {
                color,
              },
            ]}
          >
            View assigned reviews
          </Text>

          <Text
            style={[
              styles.arrow,
              {
                color,
              },
            ]}
          >
            ›
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function StatusBadge({ status }) {
  const style = getStatusStyle(status);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: style.backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          {
            color: style.color,
          },
        ]}
      >
        {STATUS_LABELS[status] || status || 'Unknown'}
      </Text>
    </View>
  );
}

function ReviewRow({
  review,
  type,
  onPress,
}) {
  const organisationName =
    review.organisation?.name ||
    'Organisation record unavailable';

  let reference = 'Review';
  let secondaryText = null;

  if (type === 'ORGANISATION') {
    reference =
      review.organisation?.name ||
      'Organisation Review';

    if (review.organisation?.registration_number) {
      secondaryText = `Registration: ${review.organisation.registration_number}`;
    }
  }

  if (type === 'FUNDING') {
    reference =
      review.fundingAgreement?.agreement_number ||
      'Funding Agreement';

    if (review.fundingAgreement?.title) {
      secondaryText =
        review.fundingAgreement.title;
    }
  }

  if (type === 'ACCOUNTABILITY') {
    reference =
      review.accountabilityCase?.case_number ||
      'Accountability Case';

    if (review.accountabilityCase?.title) {
      secondaryText =
        review.accountabilityCase.title;
    }
  }

  return (
    <View style={styles.reviewRow}>
      <View style={styles.reviewMain}>
        <Text style={styles.reviewReference}>
          {reference}
        </Text>

        <Text style={styles.reviewOrganisation}>
          {organisationName}
        </Text>

        {secondaryText ? (
          <Text style={styles.reviewSecondary}>
            {secondaryText}
          </Text>
        ) : null}

        {type === 'FUNDING' &&
        review.fundingAgreement ? (
          <Text style={styles.reviewSecondary}>
            Funding year:{' '}
            {review.fundingAgreement.funding_year ||
              '—'}
          </Text>
        ) : null}

        {type === 'FUNDING' &&
        review.fundingAgreement ? (
          <Text style={styles.reviewSecondary}>
            Allocation:{' '}
            {formatCurrency(
              review.fundingAgreement
                .allocated_amount,
              review.fundingAgreement.currency
            )}
          </Text>
        ) : null}

        {type === 'ACCOUNTABILITY' &&
        review.accountabilityCase ? (
          <Text style={styles.reviewSecondary}>
            Priority:{' '}
            {review.accountabilityCase.priority ||
              '—'}
          </Text>
        ) : null}

        {type === 'ACCOUNTABILITY' &&
        review.accountabilityCase ? (
          <Text style={styles.reviewSecondary}>
            Due:{' '}
            {formatDate(
              review.accountabilityCase.due_date
            )}
          </Text>
        ) : null}

        <Text style={styles.reviewDate}>
          Submitted {formatDate(review.submitted_at)}
        </Text>
      </View>

      <View style={styles.reviewRight}>
        <StatusBadge status={review.status} />

        <Pressable
          onPress={() => onPress(review)}
          style={({ pressed }) => [
            styles.reviewButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.reviewButtonText}>
            REVIEW
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function ReviewerDashboard() {
  /*
   * IMPORTANT:
   *
   * user = authenticated Supabase Auth user
   * profile = CIVITRACK user_profiles record
   *
   * The reviews table uses reviewer_id which should
   * match the authenticated Supabase user's UUID.
   */
  const {
    user,
    profile,
    signOut,
  } = useAuth();

  const [organisationReviews, setOrganisationReviews] =
    useState([]);

  const [fundingReviews, setFundingReviews] =
    useState([]);

  const [
    accountabilityReviews,
    setAccountabilityReviews,
  ] = useState([]);

  const [allReviews, setAllReviews] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadDashboard = useCallback(async () => {
    /*
     * Do not try to load the dashboard until AuthContext
     * has supplied the authenticated user.
     */
    if (!user?.id) {
      console.log(
        'Reviewer dashboard waiting for authenticated user...'
      );

      return;
    }

    try {
      setLoading(true);

      // --------------------------------------------------
      // GET CURRENT AUTHENTICATED USER
      // --------------------------------------------------

      const reviewerId = user.id;

      console.log(
        'CIVITRACK Reviewer ID:',
        reviewerId
      );

      console.log(
        'CIVITRACK Reviewer Role:',
        profile?.role
      );

      if (!reviewerId) {
        throw new Error(
          'Authenticated reviewer could not be identified.'
        );
      }

      // --------------------------------------------------
      // GET REVIEWER'S ASSIGNED REVIEWS
      // --------------------------------------------------

      const {
        data: reviews,
        error: reviewsError,
      } = await supabase
        .from('reviews')
        .select(`
          id,
          reviewer_id,
          organisation_id,
          funding_agreement_id,
          accountability_case_id,
          review_type,
          status,
          decision,
          reviewer_comments,
          verification_notes,
          submitted_at,
          reviewed_at,
          completed_at,
          created_at,
          updated_at
        `)
        .eq('reviewer_id', reviewerId)
        .order('created_at', {
          ascending: false,
        });

      if (reviewsError) {
        throw reviewsError;
      }

      const reviewRows = reviews || [];

      console.log(
        'CIVITRACK Reviews Found:',
        reviewRows.length
      );

      // --------------------------------------------------
      // ORGANISATION IDS
      // --------------------------------------------------

      const organisationIds = [
        ...new Set(
          reviewRows
            .filter(
              (review) =>
                review.organisation_id
            )
            .map(
              (review) =>
                review.organisation_id
            )
        ),
      ];

      // --------------------------------------------------
      // FETCH ORGANISATIONS
      // --------------------------------------------------

      let organisations = [];

      if (organisationIds.length > 0) {
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
            address,
            province,
            status,
            created_at,
            updated_at
          `)
          .in('id', organisationIds);

        if (error) {
          throw error;
        }

        organisations = data || [];
      }

      // --------------------------------------------------
      // FUNDING AGREEMENT IDS
      // --------------------------------------------------

      const fundingIds = [
        ...new Set(
          reviewRows
            .filter(
              (review) =>
                review.funding_agreement_id
            )
            .map(
              (review) =>
                review.funding_agreement_id
            )
        ),
      ];

      // --------------------------------------------------
      // FETCH FUNDING AGREEMENTS
      // --------------------------------------------------

      let fundingAgreements = [];

      if (fundingIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from('funding_agreements')
          .select(`
            id,
            organisation_id,
            agreement_number,
            title,
            description,
            funding_year,
            start_date,
            end_date,
            allocated_amount,
            currency,
            status,
            created_at,
            updated_at
          `)
          .in('id', fundingIds);

        if (error) {
          throw error;
        }

        fundingAgreements = data || [];
      }

      // --------------------------------------------------
      // ACCOUNTABILITY CASE IDS
      // --------------------------------------------------

      const accountabilityIds = [
        ...new Set(
          reviewRows
            .filter(
              (review) =>
                review.accountability_case_id
            )
            .map(
              (review) =>
                review.accountability_case_id
            )
        ),
      ];

      // --------------------------------------------------
      // FETCH ACCOUNTABILITY CASES
      // --------------------------------------------------

      let accountabilityCases = [];

      if (accountabilityIds.length > 0) {
        const {
          data,
          error,
        } = await supabase
          .from('accountability_cases')
          .select(`
            id,
            funding_agreement_id,
            organisation_id,
            case_number,
            title,
            description,
            status,
            priority,
            created_by,
            responsible_user_id,
            due_date,
            submitted_at,
            approved_at,
            completed_at,
            created_at,
            updated_at
          `)
          .in('id', accountabilityIds);

        if (error) {
          throw error;
        }

        accountabilityCases = data || [];
      }

      // --------------------------------------------------
      // CREATE LOOKUP MAPS
      // --------------------------------------------------

      const organisationMap = new Map(
        organisations.map((organisation) => [
          organisation.id,
          organisation,
        ])
      );

      const fundingMap = new Map(
        fundingAgreements.map((agreement) => [
          agreement.id,
          agreement,
        ])
      );

      const accountabilityMap = new Map(
        accountabilityCases.map((item) => [
          item.id,
          item,
        ])
      );

      // --------------------------------------------------
      // MERGE DATABASE RECORDS
      // --------------------------------------------------

      const mergedReviews = reviewRows.map(
        (review) => ({
          ...review,

          organisation:
            organisationMap.get(
              review.organisation_id
            ) || null,

          fundingAgreement:
            fundingMap.get(
              review.funding_agreement_id
            ) || null,

          accountabilityCase:
            accountabilityMap.get(
              review.accountability_case_id
            ) || null,
        })
      );

      // --------------------------------------------------
      // STORE ALL REVIEWS
      // --------------------------------------------------

      setAllReviews(mergedReviews);

      // --------------------------------------------------
      // ONLY ACTIONABLE REVIEWS FOR WORKSPACE
      // --------------------------------------------------

      const actionableReviews =
        mergedReviews.filter((review) =>
          ACTIONABLE_STATUSES.includes(
            review.status
          )
        );

      // --------------------------------------------------
      // SPLIT BY REVIEW TYPE
      // --------------------------------------------------

      const organisationReviewRows =
        actionableReviews.filter(
          (review) =>
            review.review_type ===
            'ORGANISATION'
        );

      const fundingReviewRows =
        actionableReviews.filter(
          (review) =>
            review.review_type === 'FUNDING'
        );

      const accountabilityReviewRows =
        actionableReviews.filter(
          (review) =>
            review.review_type ===
            'ACCOUNTABILITY'
        );

      setOrganisationReviews(
        organisationReviewRows
      );

      setFundingReviews(
        fundingReviewRows
      );

      setAccountabilityReviews(
        accountabilityReviewRows
      );
    } catch (error) {
      console.error(
        'Reviewer dashboard error:',
        error
      );

      Alert.alert(
        'Dashboard Error',
        error?.message ||
          'Unable to load the reviewer workspace.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, profile?.role]);

  // ----------------------------------------------------
  // RELOAD WHEN SCREEN GETS FOCUS
  // ----------------------------------------------------

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  // ----------------------------------------------------
  // REFRESH
  // ----------------------------------------------------

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  // ----------------------------------------------------
  // NAVIGATION
  // ----------------------------------------------------

  const openOrganisationReviews = () => {
    router.push(
      '/reviewer/organisation-reviews'
    );
  };

  const openFundingReviews = () => {
    router.push(
      '/reviewer/funding-reviews'
    );
  };

  const openAccountabilityReviews = () => {
    router.push(
      '/reviewer/accountability-reviews'
    );
  };

  const openReview = (review) => {
    if (!review?.id) {
      Alert.alert(
        'Review',
        'This review does not have a valid database ID.'
      );

      return;
    }

    router.push({
      pathname: '/reviewer/reviews/[id]',
      params: {
        id: review.id,
      },
    });
  };

  // ----------------------------------------------------
  // SIGN OUT
  // ----------------------------------------------------

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert(
        'Sign Out',
        error?.message ||
          'Unable to sign out.'
      );
    }
  };

  // ----------------------------------------------------
  // DATABASE-DRIVEN STATISTICS
  // ----------------------------------------------------

  const submittedCount =
    allReviews.filter(
      (review) =>
        review.status === 'SUBMITTED'
    ).length;

  const underReviewCount =
    allReviews.filter(
      (review) =>
        review.status === 'UNDER_REVIEW'
    ).length;

  const verificationCount =
    allReviews.filter(
      (review) =>
        review.status === 'VERIFICATION'
    ).length;

  const decisionCount =
    allReviews.filter(
      (review) =>
        review.status === 'DECISION'
    ).length;

  const completedCount =
    allReviews.filter(
      (review) =>
        review.status === 'COMPLETED'
    ).length;

  const rejectedCount =
    allReviews.filter(
      (review) =>
        review.status === 'REJECTED'
    ).length;

  const pendingCount =
    organisationReviews.length +
    fundingReviews.length +
    accountabilityReviews.length;

  const inProgressCount =
    underReviewCount +
    verificationCount +
    decisionCount;

  const totalReviews = allReviews.length;

  // ----------------------------------------------------
  // LOADING SCREEN
  // ----------------------------------------------------

  if (loading) {
    return (
      <ProtectedRoute
        allowedRoles={[ROLES.DSAC_REVIEWER]}
      >
        <SafeAreaView
          style={styles.loadingContainer}
        >
          <StatusBar
            barStyle="light-content"
            backgroundColor={COLORS.navy}
          />

          <ActivityIndicator
            size="large"
            color={COLORS.blue}
          />

          <Text style={styles.loadingText}>
            Loading Reviewer Workspace...
          </Text>
        </SafeAreaView>
      </ProtectedRoute>
    );
  }

  // ----------------------------------------------------
  // REVIEWER ACTIVE STATUS
  // ----------------------------------------------------

  const reviewerIsActive =
    profile?.is_active !== false;

  // ----------------------------------------------------
  // MAIN DASHBOARD
  // ----------------------------------------------------

  return (
    <ProtectedRoute
      allowedRoles={[ROLES.DSAC_REVIEWER]}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.navy}
        />

        <ScrollView
          style={styles.container}
  contentContainerStyle={styles.contentContainer}
  showsVerticalScrollIndicator={true}
  persistentScrollbar={true}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  }
        >
          {/* HEADER */}

          <View style={styles.header}>
            <View>
              <Text style={styles.department}>
                DEPARTMENT OF SPORT, ARTS AND CULTURE
              </Text>

              <Text style={styles.brand}>
                CIVITRACK
              </Text>

              <Text style={styles.headerSubtitle}>
                Reviewer Workspace
              </Text>
            </View>

            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.signOutText}>
                Sign Out
              </Text>
            </Pressable>
          </View>

          {/* WELCOME */}

          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              Welcome back
              {profile?.full_name
                ? `, ${profile.full_name}`
                : ''}
            </Text>

            <Text style={styles.welcomeText}>
              Review and process assigned
              organisational, funding and
              accountability submissions.
            </Text>
          </View>

          {/* STATISTICS */}

          <View style={styles.statsGrid}>
            <StatCard
              title="Pending Reviews"
              value={pendingCount}
              subtitle="Require your attention"
              icon="!"
              color={COLORS.orange}
            />

            <StatCard
              title="In Progress"
              value={inProgressCount}
              subtitle="Currently being reviewed"
              icon="↻"
              color={COLORS.blue}
            />

            <StatCard
              title="Completed"
              value={completedCount}
              subtitle="Completed reviews"
              icon="✓"
              color={COLORS.green}
            />
          </View>

          {/* REVIEW SUMMARY */}

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryTitle}>
                  Review Status
                </Text>

                <Text style={styles.summarySubtitle}>
                  Current status of your assigned reviews
                </Text>
              </View>

              <Text style={styles.summaryTotal}>
                {totalReviews}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {submittedCount}
                </Text>

                <Text style={styles.summaryLabel}>
                  Submitted
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {underReviewCount}
                </Text>

                <Text style={styles.summaryLabel}>
                  Under Review
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {verificationCount}
                </Text>

                <Text style={styles.summaryLabel}>
                  Verification
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {decisionCount}
                </Text>

                <Text style={styles.summaryLabel}>
                  Decision
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {completedCount}
                </Text>

                <Text style={styles.summaryLabel}>
                  Completed
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {rejectedCount}
                </Text>

                <Text style={styles.summaryLabel}>
                  Rejected
                </Text>
              </View>
            </View>
          </View>

          {/* WORKSPACE */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Reviewer Workspace
              </Text>

              <Text style={styles.sectionSubtitle}>
                Select a workspace to view assigned
                reviews
              </Text>
            </View>
          </View>

          <View style={styles.workspaceGrid}>
            <WorkspaceCard
              title="Organisation Reviews"
              description="Review assigned organisation registration, compliance and supporting information."
              count={organisationReviews.length}
              icon="O"
              color={COLORS.blue}
              onPress={
                openOrganisationReviews
              }
            />

            <WorkspaceCard
              title="Funding Reviews"
              description="Review funding agreements, allocations, documentation and compliance."
              count={fundingReviews.length}
              icon="F"
              color={COLORS.green}
              onPress={openFundingReviews}
            />

            <WorkspaceCard
              title="Accountability Reviews"
              description="Review expenditure, supporting evidence, reporting and accountability cases."
              count={
                accountabilityReviews.length
              }
              icon="A"
              color={COLORS.orange}
              onPress={
                openAccountabilityReviews
              }
            />
          </View>

          {/* ORGANISATION REVIEWS */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Organisation Reviews
              </Text>

              <Text style={styles.sectionSubtitle}>
                Assigned organisation reviews
                requiring action
              </Text>
            </View>

            {organisationReviews.length >
              0 && (
              <Pressable
                onPress={
                  openOrganisationReviews
                }
              >
                <Text
                  style={styles.viewAllText}
                >
                  View all
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.reviewCard}>
            {organisationReviews.length ===
            0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>
                  ✓
                </Text>

                <Text style={styles.emptyTitle}>
                  No organisation reviews
                </Text>

                <Text style={styles.emptyText}>
                  There are currently no assigned
                  organisation reviews requiring
                  action.
                </Text>
              </View>
            ) : (
              organisationReviews
                .slice(0, 5)
                .map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    type="ORGANISATION"
                    onPress={openReview}
                  />
                ))
            )}
          </View>

          {/* FUNDING REVIEWS */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Funding Reviews
              </Text>

              <Text style={styles.sectionSubtitle}>
                Assigned funding reviews
                requiring action
              </Text>
            </View>

            {fundingReviews.length > 0 && (
              <Pressable
                onPress={openFundingReviews}
              >
                <Text
                  style={styles.viewAllText}
                >
                  View all
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.reviewCard}>
            {fundingReviews.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>
                  ✓
                </Text>

                <Text style={styles.emptyTitle}>
                  No funding reviews
                </Text>

                <Text style={styles.emptyText}>
                  There are currently no assigned
                  funding reviews requiring action.
                </Text>
              </View>
            ) : (
              fundingReviews
                .slice(0, 5)
                .map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    type="FUNDING"
                    onPress={openReview}
                  />
                ))
            )}
          </View>

          {/* ACCOUNTABILITY REVIEWS */}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Accountability Reviews
              </Text>

              <Text style={styles.sectionSubtitle}>
                Assigned accountability cases
                requiring action
              </Text>
            </View>

            {accountabilityReviews.length >
              0 && (
              <Pressable
                onPress={
                  openAccountabilityReviews
                }
              >
                <Text
                  style={styles.viewAllText}
                >
                  View all
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.reviewCard}>
            {accountabilityReviews.length ===
            0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>
                  ✓
                </Text>

                <Text style={styles.emptyTitle}>
                  No accountability reviews
                </Text>

                <Text style={styles.emptyText}>
                  There are currently no assigned
                  accountability reviews requiring
                  action.
                </Text>
              </View>
            ) : (
              accountabilityReviews
                .slice(0, 5)
                .map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    type="ACCOUNTABILITY"
                    onPress={openReview}
                  />
                ))
            )}
          </View>

          {/* WORKFLOW */}

          <View style={styles.workflowCard}>
            <Text style={styles.workflowTitle}>
              Review Workflow
            </Text>

            <View style={styles.workflowRow}>
              <View style={styles.workflowStep}>
                <View
                  style={[
                    styles.workflowCircle,
                    {
                      backgroundColor:
                        COLORS.orange,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.workflowNumber
                    }
                  >
                    1
                  </Text>
                </View>

                <Text
                  style={styles.workflowLabel}
                >
                  Submitted
                </Text>
              </View>

              <View style={styles.workflowLine} />

              <View style={styles.workflowStep}>
                <View
                  style={[
                    styles.workflowCircle,
                    {
                      backgroundColor:
                        COLORS.blue,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.workflowNumber
                    }
                  >
                    2
                  </Text>
                </View>

                <Text
                  style={styles.workflowLabel}
                >
                  Review
                </Text>
              </View>

              <View style={styles.workflowLine} />

              <View style={styles.workflowStep}>
                <View
                  style={[
                    styles.workflowCircle,
                    {
                      backgroundColor:
                        COLORS.green,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.workflowNumber
                    }
                  >
                    3
                  </Text>
                </View>

                <Text
                  style={styles.workflowLabel}
                >
                  Decision
                </Text>
              </View>

              <View style={styles.workflowLine} />

              <View style={styles.workflowStep}>
                <View
                  style={[
                    styles.workflowCircle,
                    {
                      backgroundColor:
                        COLORS.navy,
                    },
                  ]}
                >
                  <Text
                    style={
                      styles.workflowNumber
                    }
                  >
                    4
                  </Text>
                </View>

                <Text
                  style={styles.workflowLabel}
                >
                  Complete
                </Text>
              </View>
            </View>
          </View>

          {/* REVIEWER INFORMATION */}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              Reviewer Information
            </Text>

            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>
                  Name
                </Text>

                <Text style={styles.infoValue}>
                  {profile?.full_name || '—'}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>
                  Email
                </Text>

                <Text style={styles.infoValue}>
                  {profile?.email || '—'}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>
                  Role
                </Text>

                <Text style={styles.infoValue}>
                  {profile?.role || '—'}
                </Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>
                  Status
                </Text>

                <Text
                  style={[
                    styles.infoValue,
                    {
                      color: reviewerIsActive
                        ? COLORS.green
                        : COLORS.red,
                    },
                  ]}
                >
                  {reviewerIsActive
                    ? 'Active'
                    : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>

          {/* NOTICE */}

          <View style={styles.noticeCard}>
            <Text style={styles.noticeIcon}>
              i
            </Text>

            <View style={styles.noticeContent}>
              <Text style={styles.noticeTitle}>
                Reviewer Responsibility
              </Text>

              <Text style={styles.noticeText}>
                Please review assigned submissions
                carefully and ensure that decisions
                are supported by appropriate
                documentation and verification
                notes.
              </Text>
            </View>
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              CIVITRACK • Department of Sport,
              Arts and Culture
            </Text>

            <Text style={styles.footerSubtext}>
              Public Funding & Accountability
              Management System
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: COLORS.muted,
  },

  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 24,
    paddingVertical: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  department: {
    color: '#C9D9E5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },

  brand: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 3,
  },

  headerSubtitle: {
    color: '#D7E6F0',
    fontSize: 13,
    marginTop: 2,
  },

  signOutButton: {
    borderWidth: 1,
    borderColor: '#8EAFC3',
    borderRadius: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  signOutText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },

  welcomeSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  welcomeTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: COLORS.text,
  },

  welcomeText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.muted,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },

  statCard: {
    flex: 1,
    minWidth: 210,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statIcon: {
    width: 45,
    height: 45,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statIconText: {
    fontSize: 22,
    fontWeight: '900',
  },

  statContent: {
    marginLeft: 13,
  },

  statTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },

  statValue: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 2,
  },

  statSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 1,
  },

  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 18,
  },

  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },

  summarySubtitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },

  summaryTotal: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.navy,
  },

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },

  summaryItem: {
    width: '33.33%',
    paddingVertical: 10,
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },

  summaryLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 3,
  },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.text,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },

  viewAllText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: '800',
  },

  workspaceGrid: {
    paddingHorizontal: 16,
    gap: 12,
  },

  workspaceCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 17,
    flexDirection: 'row',
  },

  pressed: {
    opacity: 0.75,
  },

  workspaceIcon: {
    width: 49,
    height: 49,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  workspaceIconText: {
    fontSize: 20,
    fontWeight: '900',
  },

  workspaceContent: {
    flex: 1,
    marginLeft: 14,
  },

  workspaceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  workspaceTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  countBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
  },

  workspaceDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
    marginTop: 6,
  },

  workspaceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
  },

  workspaceActionText: {
    fontSize: 11,
    fontWeight: '800',
  },

  arrow: {
    fontSize: 19,
    fontWeight: '800',
    marginLeft: 4,
  },

  reviewCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },

  reviewRow: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  reviewMain: {
    flex: 1,
    paddingRight: 12,
  },

  reviewReference: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  reviewOrganisation: {
    fontSize: 12,
    color: COLORS.blue,
    fontWeight: '700',
    marginTop: 4,
  },

  reviewSecondary: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 3,
  },

  reviewDate: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 5,
  },

  reviewRight: {
    alignItems: 'flex-end',
    gap: 8,
  },

  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },

  reviewButton: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },

  reviewButtonText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
  },

  emptyState: {
    padding: 30,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGreen,
    color: COLORS.green,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 40,
    fontSize: 20,
    fontWeight: '900',
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },

  emptyText: {
    marginTop: 5,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

  workflowCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 20,
  },

  workflowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 18,
  },

  workflowRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  workflowStep: {
    alignItems: 'center',
  },

  workflowCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  workflowNumber: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
  },

  workflowLabel: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: '700',
    marginTop: 6,
  },

  workflowLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 5,
    marginBottom: 18,
  },

  infoCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 20,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 14,
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  infoItem: {
    minWidth: 200,
    flex: 1,
  },

  infoLabel: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  infoValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 4,
  },

  noticeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.lightBlue,
    borderWidth: 1,
    borderColor: '#C8DDED',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
  },

  noticeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.blue,
    color: COLORS.white,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 30,
    fontWeight: '900',
  },

  noticeContent: {
    flex: 1,
    marginLeft: 12,
  },

  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.text,
  },

  noticeText: {
    fontSize: 11,
    color: COLORS.muted,
    lineHeight: 17,
    marginTop: 4,
  },

  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 25,
  },

  footerText: {
    fontSize: 10,
    color: COLORS.muted,
    fontWeight: '700',
    textAlign: 'center',
  },

  footerSubtext: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});
