// Verificar si hay un usuario logueado
const activeUser = JSON.parse(localStorage.getItem('activeUser'));

if (activeUser) {
    // Si hay usuario, puedes saludarlo
    console.log(`Bienvenido de nuevo, ${activeUser.username}`);

}

// Botón de Cerrar Sesión (Logout)
function logout() {
    localStorage.removeItem('activeUser');
    window.location.href = 'login.html';
}