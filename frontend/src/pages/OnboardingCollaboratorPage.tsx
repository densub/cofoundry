import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { teamApi } from '../lib/api'
import { useStore } from '../store/useStore'
import { Logo } from '../components/brand/Logo'

type Step = 1 | 2 | 3

const EXPERTISE_OPTIONS = [
  'marketing', 'growth', 'b2b-sales', 'content-seo', 'fundraising',
  'operations', 'finance', 'legal', 'product-management', 'ux-design',
  'brand-creative', 'domain-expert', 'community-building', 'partnerships', 'pr-communications',
]

const INDUSTRY_OPTIONS = [
  'fintech', 'health-biotech', 'edtech', 'developer-tools', 'b2b-saas',
  'consumer', 'climate', 'ai-ml', 'e-commerce', 'real-estate', 'legal-tech', 'other',
]

const EXPERTISE_LABELS: Record<string, string> = {
  'marketing': 'Marketing',
  'growth': 'Growth',
  'b2b-sales': 'B2B Sales',
  'content-seo': 'Content & SEO',
  'fundraising': 'Fundraising',
  'operations': 'Operations',
  'finance': 'Finance',
  'legal': 'Legal',
  'product-management': 'Product Management',
  'ux-design': 'UX Design',
  'brand-creative': 'Brand & Creative',
  'domain-expert': 'Domain Expert',
  'community-building': 'Community Building',
  'partnerships': 'Partnerships',
  'pr-communications': 'PR & Comms',
}

const INDUSTRY_LABELS: Record<string, string> = {
  'fintech': 'Fintech',
  'health-biotech': 'Health & Biotech',
  'edtech': 'EdTech',
  'developer-tools': 'Developer Tools',
  'b2b-saas': 'B2B SaaS',
  'consumer': 'Consumer',
  'climate': 'Climate',
  'ai-ml': 'AI / ML',
  'e-commerce': 'E-commerce',
  'real-estate': 'Real Estate',
  'legal-tech': 'Legal Tech',
  'other': 'Other',
}

function PillSelect({
  options,
  labels,
  selected,
  onChange,
}: {
  options: string[]
  labels: Record<string, string>
  selected: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`px-3 py-1.5 rounded-full text-xs border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
            selected.includes(o)
              ? 'border-brand-400 bg-brand-500/10 text-brand-300'
              : 'border-space-600 bg-space-800 text-fg-muted hover:border-fg-subtle hover:text-fg'
          }`}
        >
          {labels[o] ?? o}
        </button>
      ))}
    </div>
  )
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: 'Profile' },
    { n: 2, label: 'Expertise' },
    { n: 3, label: 'Goals' },
  ]
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          {i > 0 && <div className="h-px w-6 bg-white/10" />}
          <div className={`flex items-center gap-2 text-sm ${step === s.n ? 'text-fg' : step > s.n ? 'text-fg-subtle' : 'text-white/30'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s.n ? 'bg-brand-600' : step > s.n ? 'bg-space-700 text-fg-subtle' : 'bg-white/10'}`}>
              {step > s.n ? '✓' : s.n}
            </div>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OnboardingCollaboratorPage() {
  const navigate = useNavigate()
  const setProfile = useStore(s => s.setProfile)

  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Step 1
  const [displayName, setDisplayName] = useState('')
  const [headline, setHeadline] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [skillsDescription, setSkillsDescription] = useState('')

  // Step 2
  const [expertiseTags, setExpertiseTags] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])

  // Step 3
  const [lookingFor, setLookingFor] = useState<'cofounder' | 'early-team' | 'advisor'>('cofounder')
  const [commitment, setCommitment] = useState<'full-time' | 'part-time' | 'advisory'>('part-time')
  const [openToEquity, setOpenToEquity] = useState(true)
  const [pastVentures, setPastVentures] = useState('')

  function handleStep1() {
    if (!displayName.trim() || !headline.trim()) {
      setError('Name and headline are required')
      return
    }
    setError('')
    setStep(2)
  }

  function handleStep2() {
    if (expertiseTags.length === 0) {
      setError('Select at least one area of expertise')
      return
    }
    setError('')
    setStep(3)
  }

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    try {
      const profile = await teamApi.onboardCollaborator({
        display_name: displayName.trim(),
        headline: headline.trim(),
        expertise_tags: expertiseTags,
        industries,
        linkedin_url: linkedinUrl.trim() || undefined,
        portfolio_url: portfolioUrl.trim() || undefined,
        skills_description: skillsDescription.trim() || undefined,
        past_ventures: pastVentures.trim() || undefined,
        looking_for: lookingFor,
        commitment,
        open_to_equity: openToEquity,
      })
      localStorage.removeItem('cofoundry_join_as')
      setProfile(profile)
      navigate('/explore', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-space-950 flex items-center justify-center px-3 sm:px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-8 gap-2">
          <Logo size="lg" />
          <p className="text-fg-muted text-sm">Find projects worth your time</p>
        </div>

        <div className="card p-6 sm:p-8">
          <StepIndicator step={step} />

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-fg mb-1">Who are you?</h2>
                <p className="text-fg-muted text-sm">This is what developers see when CoFoundry matches you to their project.</p>
              </div>
              <div>
                <label className="block text-sm text-fg-muted mb-1.5">Your name *</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="input-field" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm text-fg-muted mb-1.5">Headline * <span className="text-fg-subtle">({120 - headline.length} chars left)</span></label>
                <input
                  value={headline}
                  onChange={e => setHeadline(e.target.value.slice(0, 120))}
                  className="input-field"
                  placeholder="e.g. B2B sales lead with 5 years in SaaS"
                />
              </div>
              <div>
                <label className="block text-sm text-fg-muted mb-1.5">LinkedIn URL <span className="text-fg-subtle">(optional)</span></label>
                <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} className="input-field" placeholder="https://linkedin.com/in/yourprofile" />
              </div>
              <div>
                <label className="block text-sm text-fg-muted mb-1.5">Portfolio / website <span className="text-fg-subtle">(optional)</span></label>
                <input value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} className="input-field" placeholder="https://yoursite.com" />
              </div>
              <div>
                <label className="block text-sm text-fg-muted mb-1.5">
                  Your skills & background <span className="text-fg-subtle">(optional)</span>
                </label>
                <textarea
                  value={skillsDescription}
                  onChange={e => setSkillsDescription(e.target.value.slice(0, 600))}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Describe your skills, achievements, and relevant experience. This is how developers understand what you can bring to their project."
                />
                <p className="text-xs text-fg-subtle mt-1">{600 - skillsDescription.length} chars remaining</p>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button onClick={handleStep1} className="w-full py-2.5 btn-primary font-medium text-sm">Continue →</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-fg mb-1">Your expertise</h2>
                <p className="text-fg-muted text-sm">Select everything that applies. This is how projects find you.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-fg mb-3">Areas of expertise *</p>
                <PillSelect options={EXPERTISE_OPTIONS} labels={EXPERTISE_LABELS} selected={expertiseTags} onChange={setExpertiseTags} />
              </div>
              <div>
                <p className="text-sm font-medium text-fg mb-3">Industry focus <span className="text-fg-subtle font-normal">(optional)</span></p>
                <PillSelect options={INDUSTRY_OPTIONS} labels={INDUSTRY_LABELS} selected={industries} onChange={setIndustries} />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 btn-secondary text-sm">← Back</button>
                <button onClick={handleStep2} className="flex-1 py-2.5 btn-primary font-medium text-sm">Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-fg mb-1">What are you looking for?</h2>
                <p className="text-fg-muted text-sm">Helps us show you the right kinds of projects.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-fg mb-3">Role type</p>
                <div className="space-y-2">
                  {([
                    ['cofounder', 'Co-founder', 'Equal stake, building from the ground up'],
                    ['early-team', 'Early team member', 'Joining a project that is already moving'],
                    ['advisor', 'Advisor', 'Contributing expertise on a lighter-touch basis'],
                  ] as const).map(([value, label, desc]) => (
                    <label key={value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${lookingFor === value ? 'border-brand-400/50 bg-brand-500/5' : 'border-space-600 hover:border-fg-subtle'}`}>
                      <input type="radio" name="looking_for" value={value} checked={lookingFor === value} onChange={() => setLookingFor(value)} className="mt-1 accent-brand-500" />
                      <div>
                        <p className="text-sm font-medium text-fg">{label}</p>
                        <p className="text-xs text-fg-muted">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-fg mb-3">Availability</p>
                <div className="flex gap-2">
                  {([
                    ['full-time', 'Full-time'],
                    ['part-time', 'Part-time'],
                    ['advisory', 'Advisory only'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCommitment(value)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs border transition-colors ${commitment === value ? 'border-brand-400 bg-brand-500/10 text-brand-300' : 'border-space-600 text-fg-muted hover:border-fg-subtle'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={openToEquity} onChange={e => setOpenToEquity(e.target.checked)} className="w-4 h-4 accent-brand-500 rounded" />
                <div>
                  <p className="text-sm font-medium text-fg">Open to equity-only compensation</p>
                  <p className="text-xs text-fg-muted">Early-stage projects without cash budgets</p>
                </div>
              </label>
              <div>
                <label className="block text-sm font-medium text-fg mb-1.5">Relevant background <span className="text-fg-subtle font-normal">(optional)</span></label>
                <textarea
                  value={pastVentures}
                  onChange={e => setPastVentures(e.target.value.slice(0, 500))}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Past ventures, relevant experience, or anything else that gives context to your profile..."
                />
                <p className="text-xs text-fg-subtle mt-1">{500 - pastVentures.length} chars remaining</p>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 btn-secondary text-sm">← Back</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 btn-primary font-medium text-sm disabled:opacity-60">
                  {submitting ? 'Saving…' : 'Finish & explore projects →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
