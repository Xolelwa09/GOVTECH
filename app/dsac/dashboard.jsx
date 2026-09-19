
import React, {
  useCallback,
  useState,
} from 'react';
 
import {
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
 
import {
  router,
  useFocusEffect,
} from 'expo-router';
 
import ProtectedRoute from '../../src/components/ProtectedRoute';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { ROLES } from '../../src/constants/roles';
 
export default function DSACDashboard() {
  const {
    profile,
    signOut,
  } = useAuth();
 
  const { width } = useWindowDimensions();
 
  const isDesktop = width >= 1000;
  const isTablet = width >= 650 && width < 1000;
 
  const [stats, setStats] = useState({
    organisations: 0,
    fundingAgreements: 0,
    accountabilityCases: 0,
    pendingReviews: 0,
  });
 
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
 
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
 
      const [
        organisationsResult,
        fundingResult,
        casesResult,
        reviewsResult,
      ] = await Promise.all([
        supabase
          .from('organisations')
          .select('id', {
            count: 'exact',
            head: true,
          }),
 
        supabase
          .from('funding_agreements')
          .select('id', {
            count: 'exact',
            head: true,
          }),
 
        supabase
          .from('accountability_cases')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .in('status', [
            'ASSIGNED',
            'IN PROGRESS',
            'SUBMITTED',
            'UNDER REVIEW',
            'ACTION REQUIRED',
            'RESUBMITTED',
          ]),
 
        supabase
          .from('approvals')
          .select('id', {
            count: 'exact',
            head: true,
          })
          .eq('status', 'PENDING'),
      ]);
 
      if (organisationsResult.error) {
        throw organisationsResult.error;
      }
 
      if (fundingResult.error) {
        throw fundingResult.error;
      }
 
      if (casesResult.error) {
        throw casesResult.error;
      }
 
      if (reviewsResult.error) {
        throw reviewsResult.error;
      }
 
      setStats({
        organisations: organisationsResult.count ?? 0,
        fundingAgreements: fundingResult.count ?? 0,
        accountabilityCases: casesResult.count ?? 0,
        pendingReviews: reviewsResult.count ?? 0,
      });
    } catch (error) {
      console.error(
        'DSAC dashboard loading error:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);
 
  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );
 
  const refresh = async () => {
    setRefreshing(true);
 
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  };
 
  const logout = async () => {
    try {
      await signOut();
 
      router.replace('/auth/login');
    } catch (error) {
      console.error(
        'Sign out error:',
        error
      );
    }
  };
 
  return (
    <ProtectedRoute
      allowedRoles={[ROLES.DSAC_ADMIN]}
    >
      <SafeAreaView style={styles.safeArea}>
 
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />
 
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
            />
          }
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
 
            <View style={styles.brandArea}>
 
              <View style={styles.coatContainer}>
 
                <Image
                  source={require('../../assets/images/sa-government.jpg')}
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
                DSAC ADMINISTRATOR
              </Text>
 
              <Text style={styles.userEmail}>
                {profile?.email || 'Administrator'}
              </Text>
 
              <Pressable
                onPress={logout}
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
 
            <View style={styles.navActive}>
 
              <Text style={styles.navActiveText}>
                HOME
              </Text>
 
            </View>
 
            <Pressable
              style={styles.navItem}
              onPress={() =>
                router.push('/dsac/organisations')
              }
            >
              <Text style={styles.navText}>
                ORGANISATIONS
              </Text>
            </Pressable>
 
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
 
              <Text style={styles.breadcrumbHome}>
                HOME
              </Text>
 
              <Text style={styles.breadcrumbSlash}>
                /
              </Text>
 
              <Text style={styles.breadcrumbCurrent}>
                DSAC ADMINISTRATION
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
                  DSAC Accountability Dashboard
                </Text>
 
                <Text style={styles.pageDescription}>
                  Central administration and oversight of
                  public funding, organisations and
                  accountability matters.
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
 
            {/* =================================================
                OVERVIEW
            ================================================= */}
 
            <SectionHeader
              title="ACCOUNTABILITY OVERVIEW"
              subtitle="Current system records and outstanding activities"
            />
 
            <View style={styles.stats}>
 
              <GovernmentStatCard
                title="REGISTERED ORGANISATIONS"
                value={
                  loading
                    ? '—'
                    : stats.organisations
                }
                description="NPOs and public entities"
                accent="#009366"
              />
 
              <GovernmentStatCard
                title="FUNDING AGREEMENTS"
                value={
                  loading
                    ? '—'
                    : stats.fundingAgreements
                }
                description="Recorded funding agreements"
                accent="#F7941D"
              />
 
              <GovernmentStatCard
                title="ACCOUNTABILITY CASES"
                value={
                  loading
                    ? '—'
                    : stats.accountabilityCases
                }
                description="Active accountability matters"
                accent="#0053A1"
              />
 
              <GovernmentStatCard
                title="PENDING REVIEWS"
                value={
                  loading
                    ? '—'
                    : stats.pendingReviews
                }
                description="Items awaiting official review"
                accent="#F05D2A"
              />
 
            </View>
 
            {/* =================================================
                ADMINISTRATIVE ACTIONS
            ================================================= */}
 
            <SectionHeader
              title="ADMINISTRATIVE ACTIONS"
              subtitle="Common departmental administration functions"
            />
 
            <View style={styles.actions}>
 
              <GovernmentAction
                number="01"
                title="Manage Organisations"
                description="Register and maintain NPO and public entity records."
                accent="#009366"
                onPress={() =>
                  router.push('/dsac/organisations')
                }
              />
 
              <GovernmentAction
                number="02"
                title="Funding Agreements"
                description="Record allocations, agreements and accountability requirements."
                accent="#F7941D"
                onPress={() =>
                  router.push('/dsac/funding-agreements')
                }
              />
 
              <GovernmentAction
                number="03"
                title="Accountability Cases"
                description="Create, assign and monitor accountability cases."
                accent="#0053A1"
                onPress={() =>
                  router.push('/dsac/cases')
                }
              />
 
            </View>
 
            {/* =================================================
                SOUTH AFRICAN IDENTITY PANEL
            ================================================= */}
 
            <View style={styles.identityPanel}>
 
              <View style={styles.identityFlag}>
 
                <View style={styles.identityRed} />
 
                <View style={styles.identityGreen} />
 
                <View style={styles.identityBlue} />
 
                <View style={styles.identityGold} />
 
              </View>
 
              <View style={styles.identityContent}>
 
                <Text style={styles.identityTitle}>
                  REPUBLIC OF SOUTH AFRICA
                </Text>
 
                <Text style={styles.identitySubtitle}>
                  Public Funding & Accountability
                </Text>
 
                <Text style={styles.identityText}>
                  Supporting transparent administration,
                  responsible funding management and
                  accountability across the cultural,
                  sporting and public sector environment.
                </Text>
 
              </View>
 
            </View>
 
            {/* =================================================
                GOVERNANCE WORKFLOW
            ================================================= */}
 
            <SectionHeader
              title="CIVITRACK GOVERNANCE WORKFLOW"
              subtitle="Standard administrative process"
            />
 
            <View style={styles.workflow}>
 
              <WorkflowStep
                number="01"
                title="Organisation"
                description="Register organisation"
              />
 
              <WorkflowLine />
 
              <WorkflowStep
                number="02"
                title="Funding"
                description="Create agreement"
              />
 
              <WorkflowLine />
 
              <WorkflowStep
                number="03"
                title="Case"
                description="Assign case"
              />
 
              <WorkflowLine />
 
              <WorkflowStep
                number="04"
                title="Workspace"
                description="Manage evidence"
              />
 
              <WorkflowLine />
 
              <WorkflowStep
                number="05"
                title="Review"
                description="Review and approve"
              />
 
            </View>
 
            {/* =================================================
                ADMINISTRATIVE NOTICE
            ================================================= */}
 
            <View style={styles.notice}>
 
              <View style={styles.noticeAccent} />
 
              <View style={styles.noticeContent}>
 
                <Text style={styles.noticeTitle}>
                  ADMINISTRATIVE INFORMATION
                </Text>
 
                <Text style={styles.noticeText}>
                  All records and transactions within
                  CIVITRACK should be maintained in
                  accordance with applicable departmental
                  policies, financial controls and
                  records-management requirements.
                </Text>
 
              </View>
 
            </View>
 
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
 
/* =============================================================
  STAT CARD
  ============================================================= */
 
function GovernmentStatCard({
  title,
  value,
  description,
  accent,
}) {
  return (
    <View style={styles.statCard}>
 
      <View
        style={[
          styles.statAccent,
          {
            backgroundColor: accent,
          },
        ]}
      />
 
      <Text style={styles.statLabel}>
        {title}
      </Text>
 
      <Text style={styles.statNumber}>
        {value}
      </Text>
 
      <Text style={styles.statDescription}>
        {description}
      </Text>
 
      <View
        style={[
          styles.statBottomAccent,
          {
            backgroundColor: accent,
          },
        ]}
      />

 
    </View>
  );
}
 
/* =============================================================
   ACTION CARD
  ============================================================= */
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
          {
            backgroundColor: accent,
          },
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
          {
            color: accent,
          },
        ]}
      >
        →
      </Text>
 
    </Pressable>
  );
}

 
/* =============================================================
   WORKFLOW
  ============================================================= */
function WorkflowStep({
  number,
  title,
  description,
}) {
  return (
    <View style={styles.workflowStep}>
 
      <View style={styles.workflowCircle}>
 
        <Text style={styles.workflowNumber}>
          {number}
        </Text>
 
      </View>
 
      <Text style={styles.workflowTitle}>
        {title}
      </Text>
 
      <Text style={styles.workflowDescription}>
        {description}
      </Text>
 
    </View>
  );
}
 
function WorkflowLine() {
  return (
    <View style={styles.workflowLineContainer}>
      <View style={styles.workflowLine} />
    </View>
  );
}

 
 /* =============================================================
   STYLES
 ============================================================= */
 
const styles = StyleSheet.create({
 
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
 
  /* ---------------------------------------------------------
     SOUTH AFRICAN FLAG
  --------------------------------------------------------- */
 
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
 
  /* ---------------------------------------------------------
     GOVERNMENT HEADER
  --------------------------------------------------------- */
 
  topHeader: {
    backgroundColor: '#FFFFFF',
    minHeight: 150,
    paddingHorizontal: 7,
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
    minWidth: 350,
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
    paddingRight: 20,
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
  },
 
  logoutButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#F7941D',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
 
  logoutPressed: {
    backgroundColor: '#FFF1E1',
  },
 
  logoutText: {
    color: '#F7941D',
    fontSize: 8,
    fontWeight: '900',
  },
 
  /* ---------------------------------------------------------
     SYSTEM BAR
  --------------------------------------------------------- */
 
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
 
  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */
 
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
    backgroundColor: '#E7830E',
    borderBottomWidth: 4,
    borderBottomColor: '#009366',
  },
 
  navText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
 
  navActiveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
 
  /* ---------------------------------------------------------
     MAIN
  --------------------------------------------------------- */
 
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
    color: '#F7941D',
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
 
  /* ---------------------------------------------------------
     PAGE HEADER
  --------------------------------------------------------- */
 
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
    backgroundColor: '#F7941D',
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 4,
    borderTopColor: '#009366',
    borderWidth: 1,
    borderColor: '#DDDDDD',
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
 
  /* ---------------------------------------------------------
     SECTIONS
  --------------------------------------------------------- */
 
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
    marginTop: 5,
  },
 
  sectionOrangeBar: {
    width: 5,
    height: 30,
    backgroundColor: '#F7941D',
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
 
  /* ---------------------------------------------------------
     STATISTICS
  --------------------------------------------------------- */
 
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
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
 
  /* ---------------------------------------------------------
     ACTIONS
  --------------------------------------------------------- */
 
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
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
    color: '#FFFFFF',
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
 
  /* ---------------------------------------------------------
     SOUTH AFRICAN IDENTITY PANEL
  --------------------------------------------------------- */
 
  identityPanel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    minHeight: 125,
    flexDirection: 'row',
    marginBottom: 32,
    overflow: 'hidden',
  },
 
  identityFlag: {
    width: 10,
    flexDirection: 'column',
  },
 
  identityRed: {
    flex: 1,
    backgroundColor: '#F05D2A',
  },
 
  identityGreen: {
    flex: 2,
    backgroundColor: '#009366',
  },
 
  identityBlue: {
    flex: 1,
    backgroundColor: '#0053A1',
  },
 
  identityGold: {
    flex: 1,
    backgroundColor: '#F7941D',
  },
 
  identityContent: {
    padding: 20,
    flex: 1,
  },
 
  identityTitle: {
    color: '#F7941D',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
 
  identitySubtitle: {
    color: '#222222',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
 
  identityText: {
    color: '#777777',
    fontSize: 9,
    lineHeight: 15,
    marginTop: 7,
    maxWidth: 850,
  },
 
  /* ---------------------------------------------------------
     WORKFLOW
  --------------------------------------------------------- */
 
  workflow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    paddingHorizontal: 22,
    paddingVertical: 25,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 25,
  },
 
  workflowStep: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
  },
 
  workflowCircle: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#F7941D',
    borderWidth: 3,
    borderColor: '#009366',
    alignItems: 'center',
    justifyContent: 'center',
  },
 
  workflowNumber: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
 
  workflowTitle: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 8,
  },
 
  workflowDescription: {
    color: '#888888',
    fontSize: 8,
    textAlign: 'center',
    marginTop: 4,
  },
 
  workflowLineContainer: {
    flex: 0.4,
    minWidth: 25,
    alignItems: 'center',
  },
 
  workflowLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#009366',
  },
 
  /* ---------------------------------------------------------
     NOTICE
  --------------------------------------------------------- */
 
  notice: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    flexDirection: 'row',
    marginBottom: 10,
  },
 
  noticeAccent: {
    width: 6,
    backgroundColor: '#F7941D',
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
 
  /* ---------------------------------------------------------
     FOOTER
  --------------------------------------------------------- */
 
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 5,
    borderTopColor: '#F7941D',
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
    paddingHorizontal: 20,
  },
 
  footerTitle: {
    color: '#F7941D',
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
    backgroundColor: '#009366',
    marginVertical: 13,
  },
 
  footerCopyright: {
    color: '#999999',
    fontSize: 8,
  },
 
});
