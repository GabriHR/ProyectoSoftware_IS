document.addEventListener('DOMContentLoaded', () => {
    // Limpiamos cualquier sesión anterior al entrar al login para evitar conflictos
    localStorage.removeItem('activeUser');

    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById('email') || document.querySelector('input[type="text"]');
            const passwordInput = document.getElementById('password') || document.querySelector('input[type="password"]');

            const email = emailInput.value.trim(); // Quitamos espacios extra
            const password = passwordInput.value.trim();

            try {
                console.log("Intentando login con:", email);

                const response = await fetch('/api/users/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                console.log("Respuesta servidor:", data);

                if (response.ok && data.success) {
                    // 1. GUARDAR EN LOCALSTORAGE
                    const userString = JSON.stringify(data.user);
                    localStorage.setItem('activeUser', userString);

                    // 2. VERIFICAR QUE SE GUARDÓ (El paso clave)
                    const savedUser = localStorage.getItem('activeUser');

                    if (!savedUser) {
                        alert("Error crítico: El navegador no permitió guardar la sesión.");
                        return;
                    }

                    // 3. REDIRECCIÓN SEGÚN ROL
                    console.log("Login correcto. Redirigiendo...");
                    if (data.user.role === 'admin') {
                        window.location.replace('/admin'); // replace es más seguro que href aquí
                    } else {
                        window.location.replace('/user');
                    }
                } else {
                    alert("Error: " + (data.message || "Credenciales incorrectas"));
                }

            } catch (error) {
                console.error("Error de conexión:", error);
                alert("No se pudo conectar con el servidor. Revisa la consola (F12).");
            }
        });
    }
});