document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Guardamos al usuario en el navegador
                    localStorage.setItem('activeUser', JSON.stringify(data.user));

                    // --- REDIRECCIÓN AL DASHBOARD ---
                    window.location.href = 'index.html';
                } else {
                    // Si no existe o la contraseña está mal
                    alert("Error: Usuario no encontrado o contraseña incorrecta.");
                }

            } catch (error) {
                console.error(error);
                alert("Error de conexión");
            }
        });
    }
});