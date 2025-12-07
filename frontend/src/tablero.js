document.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener ID
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    if (!projectId) {
        alert("⚠️ No se ha seleccionado proyecto.");
        window.location.href = '/user';
        return;
    }

    // ID Global para borrar archivos
    window.currentProjectId = projectId;

    try {
        // 2. Cargar Datos del Servidor
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) throw new Error("Proyecto no encontrado");

        const rawProject = await response.json();

        // 3. Asegurar que no falten datos (Evita errores visuales)
        const project = {
            ...rawProject,
            budget: rawProject.budget || 0,
            spent: rawProject.spent || 0,
            progress: rawProject.progress || 0,
            tasks: (rawProject.tasks && rawProject.tasks.length) ? rawProject.tasks : [],
            risks: (rawProject.risks && rawProject.risks.length) ? rawProject.risks : [],
            files: rawProject.files || []
        };

        // 4. Pintar la pantalla
        fillDashboard(project);
        setupUpload(projectId, project);
        setupPDF(project); // <--- Aquí está la magia del PDF arreglado

    } catch (error) {
        console.error(error);
        document.querySelector('.board-container').innerHTML =
            `<div style="text-align:center; padding:50px; color:red;">
                <h2>Error cargando proyecto</h2>
                <button class="btn" onclick="window.location.href='/user'">Volver</button>
            </div>`;
    }
});

// --- RELLENAR DATOS ---
function fillDashboard(project) {
    const setText = (id, txt) => {
        const el = document.getElementById(id);
        if(el) el.textContent = txt;
    };

    setText('p-name', project.name);
    setText('p-manager', "Resp: " + (project.manager || "-"));
    setText('p-status', project.status);
    setText('p-deadline', "Entrega: " + (project.deadline || "-"));
    setText('p-desc', project.description || "Sin descripción.");
    setText('p-display-id', project.displayId || `#${project.id}`);

    // Dinero
    const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
    setText('budget-total', fmt.format(project.budget));
    setText('budget-spent', fmt.format(project.spent));

    // Listas
    renderSimpleList('task-list-container', project.tasks, t =>
            `<span>${t.name}</span><span class="task-priority priority-${t.priority}">${t.priority}</span>`,
        "Sin tareas pendientes.");

    renderSimpleList('risk-list-container', project.risks, r =>
            `<div style="color:#c53030">⚠️ <strong>${r.name}</strong></div><small>${r.desc}</small>`,
        "<span style='color:green'>✅ Sin riesgos</span>");

    // Gráficos y Archivos
    renderFiles(project.files);
    renderCharts(project);
}

// --- GRÁFICOS ---
function renderCharts(project) {
    if (typeof Chart === 'undefined') return;

    new Chart(document.getElementById('statusChart'), {
        type: 'doughnut',
        data: {
            labels: ['Listo', 'Pendiente'],
            datasets: [{ data: [project.progress, 100 - project.progress], backgroundColor: ['#2563eb', '#eee'], borderWidth:0 }]
        },
        options: { cutout: '70%', plugins: { legend: { position: 'right' } } }
    });

    new Chart(document.getElementById('performanceChart'), {
        type: 'bar',
        data: {
            labels: ['€'],
            datasets: [
                { label: 'Gastado', data: [project.spent], backgroundColor: '#dc2626' },
                { label: 'Total', data: [project.budget], backgroundColor: '#2563eb' }
            ]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

// --- ARCHIVOS ---
function renderFiles(files) {
    const cont = document.getElementById('files-list');
    cont.innerHTML = '';
    if (!files.length) { cont.innerHTML = '<p class="muted" style="grid-column:1/-1;text-align:center">Sin archivos</p>'; return; }

    files.forEach(f => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.style.position = 'relative';
        div.innerHTML = `
            <a href="${f.url}" target="_blank" style="text-decoration:none; color:inherit; display:block;">
                <div style="font-size:2em">📄</div>
                <div style="font-weight:bold; font-size:0.8em; overflow:hidden; text-overflow:ellipsis;">${f.name}</div>
            </a>
            <button onclick="deleteFile('${f.id}')" style="position:absolute; top:5px; right:5px; background:#fee2e2; color:#991b1b; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;">&times;</button>
        `;
        cont.appendChild(div);
    });
}

// --- FUNCIONES INTERACTIVAS ---

// 1. Borrar Archivo
window.deleteFile = async (fileId) => {
    if(!confirm("¿Borrar archivo?")) return;
    try {
        const res = await fetch(`/api/upload/${window.currentProjectId}/${fileId}`, { method: 'DELETE' });
        if(res.ok) window.location.reload();
    } catch(e) { alert("Error"); }
};

// 2. Subir Archivo
function setupUpload(id) {
    const input = document.getElementById('file-input');
    document.getElementById('upload-trigger').onclick = () => input.click();

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`/api/upload/${id}`, { method: 'POST', body: formData });
            if(res.ok) { alert("✅ Subido"); window.location.reload(); }
        } catch(e) { alert("Error subida"); }
    };
}

// 3. GENERAR PDF (SIN CAMBIAR EL DISEÑO)
function setupPDF(project) {
    const btn = document.getElementById('btn-pdf');

    if (btn) {
        btn.onclick = () => {
            const element = document.getElementById('pdf-content');

            // Opciones para que salga nítido y tal cual se ve en pantalla
            const opt = {
                margin:       5, // Márgenes pequeños para aprovechar la hoja
                filename:     `Reporte_${project.name}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 }, // Máxima calidad
                html2canvas:  {
                    scale: 2,           // Para que las letras no se vean borrosas
                    useCORS: true,      // Para cargar imágenes externas si las hubiera
                    scrollY: 0          // Captura desde arriba del t odo
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' } // 'landscape' (horizontal) suele ir mejor para tableros anchos
            };

            // Generar directamente sin tocar el CSS
            html2pdf().set(opt).from(element).save();
        };
    }
}

// Auxiliar
function renderSimpleList(id, items, tpl, emptyMsg) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    if(!items || !items.length) el.innerHTML = `<li style="color:#999">${emptyMsg}</li>`;
    else items.forEach(i => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = tpl(i);
        el.appendChild(li);
    });
}