// Función para rellenar el select de "Asignar a..."
async function loadUsersIntoSelect() {
    try {
        // 1. Pedimos la lista de usuarios al backend
        const response = await fetch('http://localhost:3000/api/users');
        const users = await response.json();

        const select = document.getElementById('task-assignee');
        select.innerHTML = '<option value="">-- Selecciona un responsable --</option>';

        // 2. Creamos una <option> por cada usuario
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id; // Guardamos el ID
            option.textContent = user.username; // Mostramos el nombre
            select.appendChild(option);
        });

    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }

}

// Llama a esto cuando cargue la página o abras el modal
loadUsersIntoSelect();