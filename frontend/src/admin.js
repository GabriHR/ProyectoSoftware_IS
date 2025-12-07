document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar si es admin antes de nada
    if (!checkAuth()) return;

    // 2. Cargar datos
    loadDashboard();
});

let allUsers = [];
let allProjects = [];

// --- SEGURIDAD ---
function checkAuth() {
    const userStr = localStorage.getItem('activeUser');

    if (!userStr) {
        window.location.href = '/login';
        return false;
    }

    try {
        const user = JSON.parse(userStr);
        if (user.role !== 'admin') {
            alert("Acceso denegado. Se requieren permisos de Administrador.");
            window.location.href = '/user';
            return false;
        }
        // Mostrar nombre en la cabecera
        const nameElement = document.getElementById('admin-name');
        if (nameElement) nameElement.textContent = user.username;
        return true;
    } catch (e) {
        localStorage.removeItem('activeUser');
        window.location.href = '/login';
        return false;
    }
}

window.logout = () => {
    localStorage.removeItem('activeUser');
    window.location.href = '/login';
};

// --- CARGA DE DATOS ---
async function loadDashboard() {
    try {
        console.log("Cargando datos del dashboard...");
        const [resUsers, resProjects] = await Promise.all([
            fetch('/api/users'),
            fetch('/api/projects')
        ]);

        if (!resUsers.ok || !resProjects.ok) throw new Error("Error en la respuesta del servidor");

        allUsers = await resUsers.json();
        allProjects = await resProjects.json();

        renderKPIs();
        renderUsersTable();
        renderProjectsTable();

        // Inicializar el formulario (llenar selectores vacíos)
        initFormOptions();

    } catch (error) {
        console.error("Error cargando dashboard:", error);
        alert("Error cargando datos. Revisa que el servidor esté activo.");
    }
}

function renderKPIs() {
    document.getElementById('kpi-users').textContent = allUsers.length;
    document.getElementById('kpi-projects').textContent = allProjects.length;

    const totalBudget = allProjects.reduce((sum, p) => sum + (parseInt(p.budget) || 0), 0);
    const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
    document.getElementById('kpi-budget').textContent = fmt.format(totalBudget);
}

// --- TABLA DE USUARIOS ---
function renderUsersTable() {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '';

    allUsers.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.id}</td>
                <td><strong>${u.username}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role}">${u.role}</span></td>
                <td>${u.joined || '-'}</td>
                <td>
                    ${u.role !== 'admin' ?
            `<button class="btn-delete" onclick="deleteUser(${u.id})">Eliminar</button>` :
            '<span style="color:#aaa">Protegido</span>'}
                </td>
            </tr>`;
    });
}

// --- TABLA DE PROYECTOS ---
function renderProjectsTable() {
    const tbody = document.getElementById('project-table-body');
    tbody.innerHTML = '';

    allProjects.forEach(p => {
        const teamSize = p.members ? p.members.length : 0;
        const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

        tbody.innerHTML += `
            <tr>
                <td>${p.displayId || p.id}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.manager || 'Sin asignar'}</td>
                <td>${teamSize} miembros</td>
                <td><span class="status-dot ${getStatusClass(p.status)}"></span> ${p.status}</td>
                <td>
                    <button class="btn-new" style="padding:5px 10px; background:#f39c12;" onclick="editProject(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" style="padding:5px 10px;" onclick="deleteProject(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

// --- GESTIÓN DE MODALES Y FORMULARIOS ---

// 1. Abrir Modal (Modo Crear o Editar)
window.openModal = (mode = 'create') => {
    const modal = document.getElementById('create-modal');
    modal.classList.remove('hidden');

    if (mode === 'create') {
        document.getElementById('modal-title').textContent = "✨ Nuevo Proyecto";
        document.getElementById('create-project-form').reset(); // Limpiar inputs
        document.getElementById('p-id').value = ""; // Id vacío significa CREAR
        initFormOptions(); // Checkboxes limpios
    }
};

window.closeModal = () => document.getElementById('create-modal').classList.add('hidden');

// 2. Llenar Selects y Checkboxes (Vital para Editar)
function initFormOptions(selectedMembers = []) {
    const managerSelect = document.getElementById('p-manager');
    const currentManager = managerSelect.value; // Guardar selección actual si existe

    managerSelect.innerHTML = '<option value="">Selecciona responsable...</option>';
    const teamDiv = document.getElementById('members-checkboxes');
    teamDiv.innerHTML = '';

    allUsers.forEach(u => {
        // A. Llenar el Select de Jefes
        const option = document.createElement('option');
        option.value = u.username;
        option.textContent = `${u.username} (${u.role})`;
        managerSelect.appendChild(option);

        // B. Llenar los Checkboxes de Equipo
        // Comprobamos si este usuario ya está en la lista de miembros del proyecto
        const isChecked = selectedMembers.some(m => m.name === u.username) ? 'checked' : '';

        teamDiv.innerHTML += `
            <label style="display:flex; align-items:center; gap:10px; padding:5px; cursor:pointer;">
                <input type="checkbox" value="${u.username}" data-role="${u.role}" ${isChecked}> 
                ${u.username} <small style="color:#888">(${u.role})</small>
            </label>`;
    });

    // Restaurar jefe si estamos editando y no ha cambiado
    if (currentManager) managerSelect.value = currentManager;
}

// 3. EDITAR PROYECTO (Cargar datos en el modal)
window.editProject = (id) => {
    // Buscar el proyecto por ID (con == por si uno es string y otro número)
    const project = allProjects.find(p => p.id === id);

    if (!project) {
        alert("Error: Proyecto no encontrado en memoria local.");
        return;
    }

    // Abrir modal en modo edición
    window.openModal('edit');
    document.getElementById('modal-title').textContent = "✏️ Editar Proyecto";

    // Rellenar campos del formulario
    document.getElementById('p-id').value = project.id; // ¡IMPORTANTE!
    document.getElementById('p-name').value = project.name;
    document.getElementById('p-budget').value = project.budget;
    document.getElementById('p-deadline').value = project.deadline;
    document.getElementById('p-desc').value = project.description;
    document.getElementById('p-status').value = project.status;

    // Rellenar listas especiales
    initFormOptions(project.members || []); // Marcar los checkboxes
    document.getElementById('p-manager').value = project.manager; // Seleccionar jefe
};

// 4. GUARDAR (Submit del Formulario)
const form = document.getElementById('create-project-form');
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Obtener el ID oculto para saber si es Editar o Crear
        const id = document.getElementById('p-id').value;

        // Recoger miembros seleccionados
        const members = [];
        document.querySelectorAll('#members-checkboxes input:checked').forEach(cb => {
            members.push({ name: cb.value, role: cb.dataset.role });
        });

        // Crear objeto de datos
        const projectData = {
            name: document.getElementById('p-name').value,
            budget: parseInt(document.getElementById('p-budget').value),
            deadline: document.getElementById('p-deadline').value,
            description: document.getElementById('p-desc').value,
            manager: document.getElementById('p-manager').value,
            status: document.getElementById('p-status').value,
            members: members
        };

        // Decidir si es PUT o POST
        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/projects/${id}` : '/api/projects';

        console.log(`Enviando ${method} a ${url}`, projectData);

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });

            if (res.ok) {
                alert(id ? "✅ Proyecto actualizado correctamente" : "✅ Proyecto creado correctamente");
                window.closeModal();
                await loadDashboard(); // Recargar la tabla para ver cambios
            } else {
                const errorData = await res.json();
                alert("Error del servidor: " + (errorData.error || errorData.message || "Desconocido"));
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión al guardar.");
        }
    });
}

// --- BORRAR ---
window.deleteProject = async (id) => {
    if(!confirm("¿Estás seguro de borrar este proyecto y todos sus archivos?")) return;

    try {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if(res.ok) {
            await loadDashboard();
        } else {
            alert("No se pudo borrar el proyecto.");
        }
    } catch(e) { alert("Error de conexión"); }
};

window.deleteUser = async (id) => {
    if(!confirm("¿Borrar usuario permanentemente?")) return;
    try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if(res.ok) await loadDashboard();
        else alert("No se pudo borrar el usuario.");
    } catch(e) { alert("Error de conexión"); }
};

// --- UTILIDADES ---
function getStatusClass(s) {
    if(!s) return '';
    s = s.toLowerCase();
    if(s.includes('curso')) return 'green';
    if(s.includes('espera')) return 'orange';
    return 'gray';
}