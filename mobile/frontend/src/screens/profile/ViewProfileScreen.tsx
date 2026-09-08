import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../../theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { IconButton } from '../../components/IconButton';
import { Avatar } from '../../components/Avatar';
import { useApp } from '../../context/AppContext';
import { getPublicProfile, PublicProfile } from '../../services/api';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ViewProfile'>;

const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

export const ViewProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId } = route.params;
  const { accessToken } = useApp();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    getPublicProfile(accessToken, userId)
      .then((res) => setProfile(res.profile))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [accessToken, userId]);

  if (loading || !profile) {
    return (
      <ScreenContainer style={styles.center}>
        {loading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <>
            <MaterialCommunityIcons name="account-off-outline" size={48} color={theme.colors.textMuted} />
            <Text style={styles.emptyText}>Profile not found.</Text>
          </>
        )}
      </ScreenContainer>
    );
  }

  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const reviews = Array.isArray(profile.reviews) ? profile.reviews : [];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <IconButton name="arrow-left" accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.profileCard}>
          <Avatar uri={profile.photoUrl} name={profile.name || 'User'} size={84} verified={profile.isKycVerified} />
          <Text style={styles.name}>{profile.name || 'User'}</Text>
          {profile.isKycVerified && (
            <View style={styles.verifiedPill}>
              <MaterialCommunityIcons name="shield-check-outline" size={14} color={theme.colors.success} />
              <Text style={styles.verifiedText}>KYC Verified</Text>
            </View>
          )}
          <Text style={styles.memberSince}>Member since {monthYear(profile.memberSince)}</Text>
        </View>

        <View style={styles.statsRow}>
          <Stat
            icon="star"
            iconColor={theme.colors.accentDark}
            value={profile.ratingCount > 0 ? profile.ratingAverage.toFixed(1) : '—'}
            label={profile.ratingCount > 0 ? `${profile.ratingCount} review${profile.ratingCount === 1 ? '' : 's'}` : 'No reviews yet'}
          />
          <Stat
            icon="briefcase-check-outline"
            iconColor={theme.colors.secondary}
            value={String(profile.jobsCompletedCount)}
            label="Jobs completed"
          />
          {profile.experienceYears != null && (
            <Stat
              icon="clock-time-eight-outline"
              iconColor={theme.colors.primary}
              value={String(profile.experienceYears)}
              label="Years experience"
            />
          )}
        </View>

        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.chipRow}>
              {skills.map((skill) => (
                <View key={skill} style={styles.chip}>
                  <Text style={styles.chipText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>No reviews yet.</Text>
          ) : (
            reviews.map((review) => (
              <View key={review._id} style={styles.reviewRow}>
                <Avatar uri={review.raterPhotoUrl} name={review.raterName || 'User'} size={36} />
                <View style={styles.reviewBody}>
                  <View style={styles.reviewTopRow}>
                    <Text style={styles.reviewerName}>{review.raterName || 'User'}</Text>
                    <View style={styles.reviewStars}>
                      <MaterialCommunityIcons name="star" size={13} color={theme.colors.accentDark} />
                      <Text style={styles.reviewScore}>{review.score}</Text>
                    </View>
                  </View>
                  {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const Stat: React.FC<{
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
}> = ({ icon, iconColor, value, label }) => (
  <View style={styles.stat}>
    <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  profileCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
  },
  name: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 3,
  },
  verifiedText: {
    ...theme.typography.tiny,
    color: theme.colors.success,
    fontWeight: '700',
  },
  memberSince: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  statLabel: {
    ...theme.typography.tiny,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  section: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  chip: {
    backgroundColor: theme.colors.primaryLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  emptyReviews: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  reviewRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  reviewBody: {
    flex: 1,
  },
  reviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewerName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  reviewScore: {
    ...theme.typography.caption,
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
  reviewComment: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
