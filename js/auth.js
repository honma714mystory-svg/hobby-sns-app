// js/auth.js

// User registration function
function register(username, password, age) {
    if (age < 18) {
        console.log('You must be at least 18 years old to register.');
        return;
    }
    // Logic to register the user
    console.log(`User ${username} registered successfully!`);
}

// User login function
function login(username, password) {
    // Logic to authenticate the user
    console.log(`User ${username} logged in.`);
}

// User logout function
function logout(username) {
    // Logic to log out the user
    console.log(`User ${username} logged out.`);
}

// Age verification function
function isOldEnough(age) {
    return age >= 18;
}

// Example usage:
// register('testUser', 'password', 20);
// login('testUser', 'password');
// logout('testUser');