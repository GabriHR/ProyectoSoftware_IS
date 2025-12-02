document.addEventListener('DOMContentLoaded', () => {
    // 1. Capturamos el formulario
    const loginForm = document.getElementById('login-form');

    // Verificación de seguridad: si no encuentra el form, no hace nada
    if (!loginForm) {
        console.error("Error: No se encontró el formulario con id 'login-form'");
        return;
    }

    // 2. Escuchamos el evento de envío (Submit)
    loginForm.addEventListener('submit', async (e) => {
        // Esto evita que la página se recargue sola
        e.preventDefault();

        // 3. Capturamos los datos de los inputs por su ID
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        const email = emailInput.value;
        const password = passwordInput.value;

        // Validación básica antes de enviar
        if (!email || !password) {
            alert("Por favor, introduce usuario y contraseña.");
            return;
        }

        try {
            // 4. Enviamos la petición al servidor (Backend)

            //esta ruta es correcta??
            const response = await fetch('http://localhost:3000/api/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            // 5. Convertimos la respuesta del servidor a JSON
            const data = await response.json();

            // 6. Evaluamos la respuesta
            if (response.ok && data.success) {
                // ÉXITO:
                console.log("Login correcto:", data.user);

                // Guardamos al usuario en el navegador (LocalStorage)
                localStorage.setItem('activeUser', JSON.stringify(data.user));

                // Redirigimos al Dashboard (la raíz / o index.html)
                window.location.href = '/';
            } else {
                // ERROR (Contraseña mal o usuario no existe):
                alert("⚠️ Error: " + (data.message || "Credenciales incorrectas"));
            }

        } catch (error) {
            // ERROR DE RED (Servidor apagado o sin internet):
            console.error("Error de conexión:", error);
            alert("No se pudo conectar con el servidor. Asegúrate de que 'node server.js' esté corriendo.");
        }
    });
});