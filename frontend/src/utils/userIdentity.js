/**
 * User identity management utility
 * 
 * This utility handles persistent user identification across browser sessions
 * by storing and retrieving user information from localStorage.
 */

// Generate a random username with a prefix and 4-digit number
const generateRandomUsername = (prefix = 'User') => {
  return `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
};

// Generate a unique session ID
const generateSessionId = () => {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Get the current user identity from local storage or create a new one
 * @returns {Object} User identity with username and sessionId
 */
export const getUserIdentity = () => {
  // Try to get existing identity from localStorage
  const storedIdentity = localStorage.getItem('userIdentity');
  
  if (storedIdentity) {
    try {
      const parsedIdentity = JSON.parse(storedIdentity);
      // Validate the stored identity to ensure it has required fields
      if (parsedIdentity && parsedIdentity.username && parsedIdentity.sessionId) {
        console.log('Using existing user identity:', parsedIdentity.username);
        return parsedIdentity;
      }
    } catch (error) {
      console.error('Error parsing stored user identity:', error);
      // Continue to create a new identity if there's an error
    }
  }
  
  // Create a new identity if none exists or validation failed
  const newIdentity = {
    username: generateRandomUsername(),
    sessionId: generateSessionId(),
    createdAt: new Date().toISOString()
  };
  
  // Store the new identity in localStorage
  localStorage.setItem('userIdentity', JSON.stringify(newIdentity));
  console.log('Created new user identity:', newIdentity.username);
  
  return newIdentity;
};