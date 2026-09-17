import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { usePet } from '@/features/pet/hooks/usePet'
import { useLeaderboard } from '@/features/leaderboard'
import { useAchievements } from '@/features/achievements'
import { fetchCurrentUser } from '@/services/userService'
import { getFirebaseErrorMessage } from '@/utils/firebaseErrors'
import FadeInSection from '@/components/FadeInSection'
import Toast from '@/components/Toast'
import TaskErrorState from '@/components/tasks/TaskErrorState'
import ProfileHeader from '@/components/profile/ProfileHeader'
import MeetMochiCard from '@/components/profile/MeetMochiCard'
import StatsSummary from '@/components/profile/StatsSummary'
import LeaderboardCard from '@/components/profile/LeaderboardCard'
import AchievementGrid from '@/components/profile/AchievementGrid'
import type { UserProfile } from '@/types/auth'

/**
 * ProfilePage — the real `/profile` destination, replacing the
 * ComingSoonPage placeholder. Composes five independently-loading
 * pieces, each already backed by a real endpoint: the user's identity
 * (`GET /api/users/me`, fetched here directly — same call the old
 * DashboardPage made), a fully interactive Mochi (`MeetMochiCard`,
 * reusing the same pettable character + Feed/Play as Home, off the
 * same shared `usePet()` context so nothing here can drift out of
 * sync with Home), pet stats (`usePet()`), the leaderboard
 * (`GET /api/leaderboard`), and the achievement catalog
 * (`GET /api/achievements/me`). Each section shows its own
 * loading/error state rather than blocking on the slowest one.
 */
function ProfilePage() {
  const { currentUser, logout } = useAuth()
  const { pet, loading: petLoading, error: petError, actionError, dismissActionError } = usePet()
  const { data: leaderboard, loading: leaderboardLoading, error: leaderboardError, reload: reloadLeaderboard } =
    useLeaderboard()
  const { achievements, loading: achievementsLoading, error: achievementsError, reload: reloadAchievements } =
    useAchievements()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetchCurrentUser()
        if (!cancelled) setProfile(response.data.data)
      } catch (err) {
        if (!cancelled) setProfileError(getFirebaseErrorMessage(err))
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const provider =
    currentUser?.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email & Password'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <FadeInSection>
        {profileLoading ? (
          <div className="animate-pulse rounded-[2.5rem] border border-white/50 bg-white/35 p-10 text-center backdrop-blur-xl">
            <div className="mx-auto h-20 w-20 rounded-full bg-blush-light/70" />
            <div className="mx-auto mt-4 h-5 w-40 rounded-full bg-blush-light/70" />
            <div className="mx-auto mt-2 h-3 w-56 rounded-full bg-blush-light/50" />
          </div>
        ) : profileError || !profile ? (
          <TaskErrorState
            message={profileError ?? 'Something went wrong loading your profile.'}
            onRetry={() => window.location.reload()}
          />
        ) : (
          <ProfileHeader profile={profile} provider={provider} onLogout={logout} />
        )}
      </FadeInSection>

      <FadeInSection delay={0.08}>
        {petLoading ? (
          <SectionSkeleton />
        ) : petError || !pet ? (
          <TaskErrorState message={petError ?? "Couldn't load Mochi."} onRetry={() => window.location.reload()} />
        ) : (
          <MeetMochiCard pet={pet} />
        )}
      </FadeInSection>

      <FadeInSection delay={0.16}>
        {petLoading ? (
          <SectionSkeleton />
        ) : petError || !pet ? (
          <TaskErrorState message={petError ?? "Couldn't load your stats."} onRetry={() => window.location.reload()} />
        ) : (
          <StatsSummary pet={pet} />
        )}
      </FadeInSection>

      <FadeInSection delay={0.24}>
        {leaderboardLoading ? (
          <SectionSkeleton />
        ) : leaderboardError || !leaderboard ? (
          <TaskErrorState
            message={leaderboardError ?? "Couldn't load the leaderboard."}
            onRetry={reloadLeaderboard}
          />
        ) : (
          <LeaderboardCard topEntries={leaderboard.topEntries} me={leaderboard.me} />
        )}
      </FadeInSection>

      <FadeInSection delay={0.32}>
        {achievementsLoading ? (
          <SectionSkeleton />
        ) : achievementsError ? (
          <TaskErrorState message={achievementsError} onRetry={reloadAchievements} />
        ) : (
          <AchievementGrid achievements={achievements} />
        )}
      </FadeInSection>

      {actionError && <Toast message={actionError} onDismiss={dismissActionError} />}
    </div>
  )
}

/** Generic loading placeholder shared by every section on this page. */
function SectionSkeleton() {
  return (
    <div
      className="animate-pulse rounded-[2.5rem] border border-white/50 bg-white/35 p-8 backdrop-blur-xl"
      aria-busy="true"
    >
      <div className="h-5 w-32 rounded-full bg-blush-light/70" />
      <div className="mt-4 h-24 w-full rounded-2xl bg-blush-light/50" />
    </div>
  )
}

export default ProfilePage
