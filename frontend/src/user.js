document.addEventListener('DOMContentLoaded', () => {
    // 1. Personalizar saludo (NUEVO)
    checkUser();

    // 2. Cargar datos y configurar filtros
    loadProjects();
    setupSearch();
    setupModalClose();
});

let allProjects = [];

// --- SALUDO DINÁMICO ---
function checkUser() {
    const userStr = localStorage.getItem('activeUser');
    if (userStr) {
        const user = JSON.parse(userStr);
        const nameElement = document.getElementById('user-display-name');
        if (nameElement) {
            // Ponemos el nombre real del usuario logueado
            nameElement.textContent = `Hola, ${user.username}`;
        }
    } else {
        // Si no hay usuario, mandamos al login por seguridad
        window.location.href = '/login';
    }
}

// --- CARGAR DATOS ---
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error("Error conectando al servidor");

        allProjects = await response.json();

        renderTable(allProjects);
        populateStatusDropdown(allProjects); // (Opcional si usas el filtro de arriba)

        if (allProjects.length > 0) {
            updateSidebar(allProjects[0]);
        } else {
            // Limpiar sidebar si no hay proyectos
            document.getElementById('sidebar-title').textContent = "Sin proyectos";
        }

    } catch (error) {
        console.error(error);
        document.getElementById('projects-table-body').innerHTML =
            '<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">Error cargando datos.</td></tr>';
    }
}

// --- PINTAR TABLA (CON BOTÓN ELIMINAR) ---
function renderTable(projectsToRender) {
    const tbody = document.getElementById('projects-table-body');
    tbody.innerHTML = '';

    if (projectsToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#666;">No hay proyectos encontrados.</td></tr>';
        return;
    }

    projectsToRender.forEach(project => {
        const row = document.createElement('tr');
        row.style.cursor = "pointer";

        // Al pasar el ratón, actualizamos la derecha
        row.addEventListener('mouseenter', () => updateSidebar(project));

        row.innerHTML = `
            <td><strong>${project.name}</strong></td>
            <td><span class="chip ${getStatusClass(project.status)}">${project.status}</span></td>
            <td>
                <div class="progress" style="background:#eee; height:8px; width:100px; border-radius:4px;">
                    <div class="bar" style="width:${project.progress}%; background:#007bff; height:100%; border-radius:4px;"></div>
                </div>
                <small>${project.progress}%</small>
            </td>
            <td>${project.deadline}</td>
            <td>
                <button class="btn primary" onclick="openProjectModal(${project.id})">Ver</button>
                <button class="btn danger" onclick="deleteProject(${project.id})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- FUNCIÓN DE ELIMINAR (NUEVO) ---
// La hacemos global (window) para que el HTML pueda llamarla
window.deleteProject = async (id) => {
    // Evitamos que el clic en el botón dispare otros eventos de la fila
    event.stopPropagation();

    if(!confirm("¿Estás seguro de que quieres eliminar este proyecto permanentemente?")) return;

    try {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });

        if (res.ok) {
            // Recargamos la lista para ver que desaparece
            loadProjects();
            alert("Proyecto eliminado.");
        } else {
            alert("No se pudo eliminar el proyecto.");
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión al eliminar.");
    }
};

// --- ACTUALIZAR BARRA LATERAL ---
function updateSidebar(project) {
    const setText = (id, txt) => {
        const el = document.getElementById(id);
        if(el) el.textContent = txt;
    };
    setText('sidebar-title', project.name);
    setText('sidebar-manager', project.manager);
    setText('sidebar-progress', project.progress + '%');
    setText('sidebar-tasks', (project.tasks ? project.tasks.length : 0));
}

// --- MODAL ---
window.openProjectModal = (id) => {
    // StopPropagation por si acaso se dispara desde la fila
    if(event) event.stopPropagation();

    const project = allProjects.find(p => p.id === id);
    if (!project) return;

    document.getElementById('modal-title').textContent = project.name;
    document.getElementById('modal-manager').textContent = project.manager;
    document.getElementById('modal-desc').textContent = project.description;

    const statusEl = document.getElementById('modal-status');
    statusEl.textContent = project.status;
    statusEl.className = 'status-badge ' + getStatusClass(project.status);

    const list = document.getElementById('modal-members-list');
    list.innerHTML = '';

    if (project.members && project.members.length > 0) {
        project.members.forEach(m => {
            const li = document.createElement('li');
            li.style.cssText = "padding:10px 0; border-bottom:1px solid #eee; display:flex; justify-content:space-between;";
            li.innerHTML = `<span>👤 <strong>${m.name}</strong></span> <span>${m.role}</span>`;
            list.appendChild(li);
        });
    } else {
        list.innerHTML = '<li style="color:#999; padding:10px;">Sin miembros.</li>';
    }

    // Botones dinámicos del modal
    let actions = document.getElementById('modal-actions-dynamic');
    if (!actions) {
        const body = document.querySelector('.modal-content');
        actions = document.createElement('div');
        actions.id = 'modal-actions-dynamic';
        actions.style.cssText = "margin-top:20px; padding-top:15px; border-top:1px solid #eee; display:flex; justify-content:flex-end; gap:10px;";
        body.appendChild(actions);
    }
    actions.innerHTML = '';

    const btnClose = document.createElement('button');
    btnClose.className = 'btn';
    btnClose.textContent = 'Cerrar';
    btnClose.onclick = () => document.getElementById('project-modal').classList.add('hidden');

    const btnBoard = document.createElement('button');
    btnBoard.className = 'btn primary';
    btnBoard.innerHTML = 'Ir al tablero 🚀';
    btnBoard.onclick = () => window.location.href = `/tablero?id=${id}`;

    actions.appendChild(btnClose);
    actions.appendChild(btnBoard);

    document.getElementById('project-modal').classList.remove('hidden');
};

// --- CREACIÓN DE PROYECTOS (Tu código anterior integrado) ---
const btnNewProject = document.querySelector('.actions .btn.primary');
if (btnNewProject) {
    btnNewProject.onclick = () => {
        const modal = document.getElementById('create-modal');
        if(modal) modal.classList.remove('hidden');
    };
}

window.closeCreateModal = () => {
    document.getElementById('create-modal').classList.add('hidden');
};

const createForm = document.getElementById('create-form');
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newProjectData = {
            name: document.getElementById('new-name').value,
            manager: document.getElementById('new-manager').value,
            deadline: document.getElementById('new-deadline').value,
            status: document.getElementById('new-status').value,
            description: document.getElementById('new-desc').value,
            progress: 0, budget: 0, spent: 0, tasks: [], risks: [], files: []
        };

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProjectData)
            });

            if (res.ok) {
                alert("✅ Proyecto creado");
                window.closeCreateModal();
                createForm.reset();
                loadProjects();
            } else {
                alert("Error al guardar");
            }
        } catch (error) { console.error(error); alert("Error conexión"); }
    });
}

// --- UTILIDADES ---
function getStatusClass(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('curso')) return 'active';
    if (s.includes('completado')) return 'done';
    return 'paused';
}

function setupSearch() {
    const searchInput = document.getElementById('search');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allProjects.filter(p => p.name.toLowerCase().includes(term));
            renderTable(filtered);
        });
    }
}

function setupModalClose() {
    const modal = document.getElementById('project-modal');
    const closeBtn = document.querySelector('.close-modal');
    if(closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
    window.onclick = (e) => { if(e.target == modal) modal.classList.add('hidden'); };
}

// (Opcional) Si quieres que funcione el filtro del desplegable
function populateStatusDropdown(projects) {
    // Tu lógica de desplegable si la tenías
}