document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    setupFilters(); // <--- Nueva función unificada de filtros
    setupModalClose();
});

let allProjects = [];

// 1. CARGAR DATOS
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error("Error conectando al servidor");

        allProjects = await response.json();

        // Pintamos la tabla inicial
        renderTable(allProjects);

        // Rellenamos el desplegable automáticamente con los estados que existan
        populateStatusDropdown(allProjects);

        // Cargar el primero en el panel lateral
        if (allProjects.length > 0) {
            updateSidebar(allProjects[0]);
        }

    } catch (error) {
        console.error(error);
        document.getElementById('projects-table-body').innerHTML =
            '<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">Error cargando datos.</td></tr>';
    }
}

// 2. CONFIGURAR LOS FILTROS (Buscador + Desplegable)
function setupFilters() {
    const searchInput = document.getElementById('search');
    const statusSelect = document.getElementById('projectSelect');

    // Función que aplica ambos filtros a la vez
    const applyFilters = () => {
        const searchText = searchInput.value.toLowerCase();
        const selectedStatus = statusSelect.value;

        const filtered = allProjects.filter(project => {
            // 1. ¿Coincide nombre?
            const matchesSearch = project.name.toLowerCase().includes(searchText);
            // 2. ¿Coincide estado? (Si es 'all' pasan todos)
            const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        renderTable(filtered);
    };

    // Escuchamos eventos en ambos
    searchInput.addEventListener('input', applyFilters);
    statusSelect.addEventListener('change', applyFilters);
}

// 3. RELLENAR DESPLEGABLE DINÁMICAMENTE
function populateStatusDropdown(projects) {
    const select = document.getElementById('projectSelect');

    // Obtenemos los estados únicos que existen en la base de datos
    // Set elimina duplicados automáticamente
    const uniqueStatuses = [...new Set(projects.map(p => p.status))];

    // Limpiamos (dejando solo la opción "Todos")
    select.innerHTML = '<option value="all">Todos los estados</option>';

    // Creamos las opciones
    uniqueStatuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status; // Ej. "En curso"
        select.appendChild(option);
    });
}

// 4. PINTAR TABLA
function renderTable(projectsToRender) {
    const tbody = document.getElementById('projects-table-body');
    tbody.innerHTML = '';

    if (projectsToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#666;">No se encontraron proyectos con esos filtros.</td></tr>';
        return;
    }

    projectsToRender.forEach(project => {
        const row = document.createElement('tr');
        row.style.cursor = "pointer";
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
                <button class="btn primary" onclick="openProjectModal(${project.id})">Ver Detalles</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 5. ACTUALIZAR BARRA LATERAL
function updateSidebar(project) {
    if(!project) return;
    const setText = (id, txt) => {
        const el = document.getElementById(id);
        if(el) el.textContent = txt;
    };
    setText('sidebar-title', project.name);
    setText('sidebar-manager', project.manager);
    setText('sidebar-progress', project.progress + '%');
    setText('sidebar-tasks', (project.tasks ? project.tasks.length : 0));
}

// 6. MODAL
window.openProjectModal = (id) => {
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

    // Botones dinámicos
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

function getStatusClass(status) {
    if (!status) return '';
    const s = status.toLowerCase();
    if (s.includes('curso')) return 'active';
    if (s.includes('completado')) return 'done';
    return 'paused';
}

function setupModalClose() {
    const modal = document.getElementById('project-modal');
    const closeBtn = document.querySelector('.close-modal');
    if(closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');
    window.onclick = (e) => { if(e.target === modal) modal.classList.add('hidden'); };
}

// --- LÓGICA DE CREACIÓN DE NUEVOS PROYECTOS ---

// 1. Abrir Modal de Creación
const btnNewProject = document.querySelector('.actions .btn.primary');
if (btnNewProject) {
    btnNewProject.onclick = () => {
        // Asegúrate de tener este modal en tu HTML (Paso 3)
        const modal = document.getElementById('create-modal');
        if(modal) modal.classList.remove('hidden');
    };
}

// 2. Cerrar Modal de Creación
window.closeCreateModal = () => {
    document.getElementById('create-modal').classList.add('hidden');
};

// 3. Enviar Formulario al Servidor
const createForm = document.getElementById('create-form');
if (createForm) {
    createForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitar recarga

        const newProjectData = {
            name: document.getElementById('new-name').value,
            manager: document.getElementById('new-manager').value,
            deadline: document.getElementById('new-deadline').value,
            status: document.getElementById('new-status').value,
            description: document.getElementById('new-desc').value,
            // Valores por defecto
            progress: 0,
            budget: 0,
            spent: 0,
            tasks: [],
            risks: [],
            files: []
        };

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProjectData)
            });

            if (res.ok) {
                alert("✅ Proyecto creado exitosamente");
                window.closeCreateModal();
                createForm.reset();
                loadProjects(); // Recargamos la tabla para ver el nuevo proyecto
            } else {
                alert("Error al guardar en el servidor");
            }
        } catch (error) {
            console.error(error);
            alert("Error de conexión");
        }
    });
}