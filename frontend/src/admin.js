document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;
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
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
        alert("Acceso denegado.");
        window.location.href = '/user';
        return false;
    }
    document.getElementById('admin-name').textContent = user.username;
    return true;
}

window.logout = () => {
    localStorage.removeItem('activeUser');
    window.location.href = '/login';
};

// --- CARGA DE DATOS ---
async function loadDashboard() {
    try {
        const [uRes, pRes] = await Promise.all([fetch('/api/users'), fetch('/api/projects')]);
        allUsers = await uRes.json();
        allProjects = await pRes.json();

        renderKPIs();
        renderUsersTable();
        renderProjectsTable();
        // Inicializamos el formulario vacío para tener los selects listos
        initFormOptions();
    } catch (e) { console.error(e); }
}

function renderKPIs() {
    document.getElementById('kpi-users').textContent = allUsers.length;
    document.getElementById('kpi-projects').textContent = allProjects.length;
    const total = allProjects.reduce((sum, p) => sum + (parseInt(p.budget)||0), 0);
    const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
    document.getElementById('kpi-budget').textContent = fmt.format(total);
}

// --- TABLAS ---
function renderUsersTable() {
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '';
    allUsers.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.id}</td><td>${u.username}</td><td>${u.email}</td>
                <td><span class="badge ${u.role}">${u.role}</span></td>
                <td>${u.joined || '-'}</td>
                <td>${u.role !== 'admin' ? `<button class="btn-delete" onclick="deleteUser(${u.id})"><i class="fas fa-trash"></i></button>` : '-'}</td>
            </tr>`;
    });
}

function renderProjectsTable() {
    const tbody = document.getElementById('project-table-body');
    tbody.innerHTML = '';
    allProjects.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.displayId || '#'}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.manager}</td>
                <td>${p.members ? p.members.length : 0}</td>
                <td><span class="status-dot ${getStatusClass(p.status)}"></span> ${p.status}</td>
                <td>
                    <button class="btn-new" style="padding:5px 10px; margin-right:5px;" onclick="editProject(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" style="padding:5px 10px;" onclick="deleteProject(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
}

// --- GESTIÓN DE PROYECTOS (CRUD) ---

// 1. ABRIR MODAL
window.openModal = (mode = 'create') => {
    const modal = document.getElementById('create-modal');
    modal.classList.remove('hidden');

    if (mode === 'create') {
        document.getElementById('modal-title').textContent = "✨ Nuevo Proyecto";
        document.getElementById('project-form').reset();
        document.getElementById('p-id').value = ""; // ID vacío = Crear
        initFormOptions();
    }
};

window.closeModal = () => document.getElementById('create-modal').classList.add('hidden');

// 2. LLENAR OPCIONES DEL FORMULARIO
function initFormOptions(selectedMembers = []) {
    const managerSelect = document.getElementById('p-manager');
    const currentManager = managerSelect.value;

    managerSelect.innerHTML = '<option value="">Selecciona responsable...</option>';
    const teamDiv = document.getElementById('members-checkboxes');
    teamDiv.innerHTML = '';

    allUsers.forEach(u => {
        // Select Jefe
        managerSelect.innerHTML += `<option value="${u.username}">${u.username} (${u.role})</option>`;

        // Checkboxes Equipo (CORREGIDO: Busca coincidencia de nombre)
        const isChecked = selectedMembers.some(m => m.name === u.username) ? 'checked' : '';
        teamDiv.innerHTML += `
            <label style="display:flex;align-items:center;gap:8px;padding:5px;cursor:pointer;">
                <input type="checkbox" value="${u.username}" data-role="${u.role}" ${isChecked}> ${u.username}
            </label>`;
    });

    // Restaurar selección previa del jefe si aplica
    if(currentManager) managerSelect.value = currentManager;
}

// 3. EDITAR PROYECTO
window.editProject = (id) => {
    // Usamos == para que coincida string con numero
    const project = allProjects.find(p => p.id == id);
    if (!project) return;

    window.openModal('edit');
    document.getElementById('modal-title').textContent = "✏️ Editar Proyecto";

    // Rellenar campos
    document.getElementById('p-id').value = project.id;
    document.getElementById('p-name').value = project.name;
    document.getElementById('p-budget').value = project.budget;
    document.getElementById('p-deadline').value = project.deadline;
    document.getElementById('p-desc').value = project.description;
    document.getElementById('p-status').value = project.status;

    // Rellenar Jefe y Equipo
    initFormOptions(project.members || []);
    document.getElementById('p-manager').value = project.manager;
};

// 4. GUARDAR (CREAR O ACTUALIZAR)
document.getElementById('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('p-id').value;
    const members = [];
    document.querySelectorAll('#members-checkboxes input:checked').forEach(cb => {
        members.push({ name: cb.value, role: cb.dataset.role });
    });

    const data = {
        name: document.getElementById('p-name').value,
        budget: parseInt(document.getElementById('p-budget').value),
        deadline: document.getElementById('p-deadline').value,
        description: document.getElementById('p-desc').value,
        manager: document.getElementById('p-manager').value,
        status: document.getElementById('p-status').value,
        members: members
    };

    // Si hay ID es PUT (Editar), si no es POST (Crear)
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/projects/${id}` : '/api/projects';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if(res.ok) {
            alert(id ? "✅ Proyecto actualizado" : "✅ Proyecto creado");
            window.closeModal();
            loadDashboard();
        } else {
            const err = await res.json();
            alert("Error: " + (err.error || "Fallo en el servidor"));
        }
    } catch (err) {
        console.error(err);
        alert("Error de conexión");
    }
});

// 5. BORRAR
window.deleteProject = async (id) => {
    if(!confirm("¿Borrar este proyecto?")) return;
    try {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if(res.ok) loadDashboard();
        else alert("Error al borrar");
    } catch(e) { alert("Error de conexión"); }
};

window.deleteUser = async (id) => {
    if(!confirm("¿Borrar usuario?")) return;
    try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        if(res.ok) loadDashboard();
        else alert("Error al borrar");
    } catch(e) { alert("Error de conexión"); }
};

function getStatusClass(s) {
    if(!s) return ''; s=s.toLowerCase();
    if(s.includes('curso')) return 'green';
    if(s.includes('espera')) return 'orange';
    return 'gray';
}