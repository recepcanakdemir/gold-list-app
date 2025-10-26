export interface OnboardingStep {
  route: string
  stepNumber: number
  title: string
  canSkip: boolean
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { route: '/(onboarding)/welcome', stepNumber: 1, title: 'Welcome', canSkip: true },
  { route: '/(onboarding)/learn-science', stepNumber: 2, title: 'Learn with Science', canSkip: true },
  { route: '/(onboarding)/structured-progress', stepNumber: 3, title: 'Structured Progress', canSkip: true },
  { route: '/(onboarding)/track-grow', stepNumber: 4, title: 'Track & Grow', canSkip: true },
  { route: '/(onboarding)/science-behind', stepNumber: 5, title: 'Science Behind', canSkip: true },
  { route: '/(onboarding)/step-1-add', stepNumber: 6, title: 'Step 1 - Add', canSkip: true },
  { route: '/(onboarding)/step-2-wait', stepNumber: 7, title: 'Step 2 - Wait', canSkip: true },
  { route: '/(onboarding)/step-3-review', stepNumber: 8, title: 'Step 3 - Review', canSkip: true },
  { route: '/(onboarding)/step-4-rounds', stepNumber: 9, title: 'Step 4 - Rounds', canSkip: true },
  { route: '/(onboarding)/step-5-focus', stepNumber: 10, title: 'Step 5 - Focus', canSkip: true },
  { route: '/(onboarding)/personalization', stepNumber: 11, title: 'Personalization', canSkip: false },
  // Survey questions as individual steps (12-20)
  { route: '/(onboarding)/survey?step=hearAboutUs', stepNumber: 12, title: 'Survey - How did you hear about us?', canSkip: false },
  { route: '/(onboarding)/survey?step=language', stepNumber: 13, title: 'Survey - Learning Language', canSkip: false },
  { route: '/(onboarding)/survey?step=level', stepNumber: 14, title: 'Survey - Current Level', canSkip: false },
  { route: '/(onboarding)/survey?step=challenge', stepNumber: 15, title: 'Survey - Biggest Challenge', canSkip: false },
  { route: '/(onboarding)/survey?step=memory', stepNumber: 16, title: 'Survey - Memory Type', canSkip: false },
  { route: '/(onboarding)/survey?step=goldListExperience', stepNumber: 17, title: 'Survey - Gold List Experience', canSkip: false },
  { route: '/(onboarding)/survey?step=unknownWordsDaily', stepNumber: 18, title: 'Survey - Unknown Words Daily', canSkip: false },
  { route: '/(onboarding)/survey?step=findWordsFrom', stepNumber: 19, title: 'Survey - Word Sources', canSkip: false },
  { route: '/(onboarding)/survey?step=learningReason', stepNumber: 20, title: 'Survey - Learning Reason', canSkip: false },
  { route: '/(onboarding)/loading', stepNumber: 21, title: 'Loading', canSkip: false },
  { route: '/(onboarding)/insights', stepNumber: 22, title: 'Insights', canSkip: false },
  { route: '/(onboarding)/roadmap', stepNumber: 23, title: 'Roadmap', canSkip: false },
  { route: '/(onboarding)/completion', stepNumber: 24, title: 'Completion', canSkip: false },
]

export const TOTAL_STEPS = ONBOARDING_STEPS.length

export function getCurrentStep(currentRoute: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find(step => step.route === currentRoute)
}

export function getStepByNumber(stepNumber: number): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find(step => step.stepNumber === stepNumber)
}

export function getNextStep(currentRoute: string): OnboardingStep | undefined {
  const currentStep = getCurrentStep(currentRoute)
  if (!currentStep) return undefined
  
  return getStepByNumber(currentStep.stepNumber + 1)
}

export function getPreviousStep(currentRoute: string): OnboardingStep | undefined {
  const currentStep = getCurrentStep(currentRoute)
  if (!currentStep) return undefined
  
  return getStepByNumber(currentStep.stepNumber - 1)
}

export function getSkipTarget(currentRoute: string): string {
  const nextStep = getNextStep(currentRoute)
  return nextStep?.route || '/(onboarding)/completion'
}

export function canSkip(currentRoute: string): boolean {
  const currentStep = getCurrentStep(currentRoute)
  return currentStep?.canSkip ?? false
}

export function getRouteFromSegments(segments: string[]): string {
  if (segments.length === 0) return ''
  
  if (segments[0] === '(onboarding)' && segments[1]) {
    return `/(onboarding)/${segments[1]}`
  }
  
  if (segments[0] === 'paywall') {
    return '/paywall'
  }
  
  return segments.join('/')
}