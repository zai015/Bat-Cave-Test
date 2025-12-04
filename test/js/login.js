document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginSubtext = document.getElementById('loginSubtext');
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');

    let isRegisterMode = false;

    // Check if any users exist
    fetch('../php/auth_handler.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=check_users'
    })
        .then(response => response.json())
        .then(data => {
            if (!data.hasUsers) {
                isRegisterMode = true;
                document.title = "Create Admin - Bat Cave";
                document.querySelector('.login-header h1').textContent = "Welcome!";
                loginSubtext.textContent = "No admin account found. Please create one.";
                submitBtn.textContent = "Create Account";
            }
        })
        .catch(err => console.error('Error checking users:', err));

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const action = isRegisterMode ? 'register' : 'login';

        fetch('../php/auth_handler.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=${action}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Set session flag
                    localStorage.setItem('batCaveAdminAuth', 'true');
                    localStorage.setItem('batCaveAdminUser', username);

                    // Redirect
                    window.location.href = 'admin.html';
                } else {
                    showError(data.message || 'An error occurred');
                }
            })
            .catch(err => {
                console.error('Auth error:', err);
                showError('Connection error. Please try again.');
            });
    });

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 3000);
    }
});
