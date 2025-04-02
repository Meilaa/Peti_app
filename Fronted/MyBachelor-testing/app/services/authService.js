// authService.js
const authService = {
  login: (username, password) => {
    if (username === 'admin' && password === 'password') {
      return true;  // mock success
    } else {
      return false;  // mock failure
    }
  },

  logout: () => {
    return 'Logged out';
  },
};

export default authService; // Default export
