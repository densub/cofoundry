import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useStore } from '../store/useStore'
import { profileApi } from '../lib/api'

export default function SettingsPage() {
  const { user, deleteAccount } = useAuth()
  const profile = useStore(s => s.profile)
  const setProfile = useStore(s => s.setProfile)
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [role, setRole] = useState(profile?.role ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canDelete = confirmText === 'DELETE'

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setRole(profile?.role ?? '')
    setBio(profile?.bio ?? '')
  }, [profile])

  async function handleSaveProfile() {
    setSavingProfile(true)
    setProfileMessage(null)
    setProfileError(null)
    try {
      const updated = await profileApi.updateMe({
        display_name: displayName.trim(),
        role: role.trim(),
        bio: bio.trim(),
      })
      setProfile(updated)
      setProfileMessage('Profile saved')
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleDeleteAccount() {
    if (!canDelete) return
    setDeleting(true)
    setError(null)
    try {
      await deleteAccount()
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm mt-1">Manage your account</p>
      </div>

      <section className="rounded-xl border border-space-600 bg-space-800/50 p-4 sm:p-6 mb-6">
        <h2 className="text-sm font-semibold text-fg mb-4">Account</h2>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-fg-muted">Email</dt>
            <dd className="text-fg mt-0.5">{user?.email ?? '—'}</dd>
          </div>
          {profile?.display_name && (
            <div>
              <dt className="text-fg-muted">Display name</dt>
              <dd className="text-fg mt-0.5">{profile.display_name}</dd>
            </div>
          )}
          {profile?.username && (
            <div>
              <dt className="text-fg-muted">Username</dt>
              <dd className="text-fg mt-0.5">@{profile.username}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-space-600 bg-space-800/50 p-4 sm:p-6 mb-6">
        <h2 className="text-sm font-semibold text-fg mb-1">Profile</h2>
        <p className="text-sm text-fg-muted mb-5">
          This is the profile information collected during onboarding.
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Name</label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full rounded-xl bg-space-900 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Role</label>
            <input
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full rounded-xl bg-space-900 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={5}
              className="w-full rounded-xl bg-space-900 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          {profileMessage && <p className="text-sm text-emerald-400">{profileMessage}</p>}
          {profileError && <p className="text-sm text-red-400">{profileError}</p>}

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 font-medium text-sm transition-colors"
          >
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-red-400 mb-2">Delete account</h2>
        <p className="text-sm text-fg-muted mb-4">
          Permanently removes your profile, knowledge graph, conversations, integrations, and
          matches. This cannot be undone.
        </p>

        <label className="block text-xs text-fg-muted mb-2">
          Type <span className="font-mono text-fg">DELETE</span> to confirm
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="DELETE"
          autoComplete="off"
          className="w-full max-w-xs px-3 py-2 rounded-lg bg-space-900 border border-space-600 text-fg text-sm placeholder:text-fg-muted/50 focus:outline-none focus:border-red-500/50 mb-4"
        />

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={!canDelete || deleting}
          className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {deleting ? 'Deleting…' : 'Delete my account'}
        </button>
      </section>
    </div>
  )
}
