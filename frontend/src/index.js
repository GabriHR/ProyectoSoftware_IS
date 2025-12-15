// frontend/src/index.js

// Verificar si hay un usuario logueado
const activeUser = JSON.parse(localStorage.getItem('activeUser'));

if (!activeUser) {
    // Si no hay usuario, ¡fuera de aquí! Al login.
    window.location.href = '/login';
} else {
    // Si hay usuario, puedes saludarlo
    console.log(`Bienvenido de nuevo, ${activeUser.username}`);
    // Aquí cargarías tus tareas (TaskFlow)
}

// Botón de Cerrar Sesión (Logout)
function logout() {
    localStorage.removeItem('activeUser');
    window.location.href = '/login';
}