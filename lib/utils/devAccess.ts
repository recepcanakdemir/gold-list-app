/**
 * Developer Account Access Control
 * 
 * Controls access to development features like DevTime simulation
 * and reset data functionality based on user account.
 */

/**
 * Checks if the given email belongs to a developer account
 * @param email - User email to check
 * @returns true if the email is a developer account, false otherwise
 */
export const isDeveloperAccount = (email: string): boolean => {
  // Developer account email
  const developerEmail = 'nakdemir51@gmail.com'
  
  // Exact match for security
  return email === developerEmail
}

/**
 * Hook to check if current user is a developer
 * @param userEmail - Current user's email
 * @returns boolean indicating developer status
 */
export const useIsDeveloper = (userEmail?: string): boolean => {
  if (!userEmail) return false
  return isDeveloperAccount(userEmail)
}