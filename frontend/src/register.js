document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');

    if(registerForm){
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Recoger datos de los inputs (asegúrate que los IDs coincidan con tu HTML)
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // --- AQUÍ ESTÁ LA REDIRECCIÓN QUE PEDISTE ---
                    alert("¡Cuenta creada! Redirigiendo al inicio de sesión...");
                    window.location.href = '/login';
                } else {
                    alert("Error: " + data.message);
                }

            } catch (error) {
                console.error(error);
                alert("Error de conexión");
            }
        });
    }
});