document.addEventListener('DOMContentLoaded', async () => {
    // 1. Obtener el ID de la URL (ej: /tablero?id=1)
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    if (!projectId) {
        alert("⚠️ No se ha seleccionado proyecto.");
        window.location.href = '/user';
        return;
    }

    try {
        // 2. Pedir datos reales al servidor
        const response = await fetch(`/api/projects/${projectId}`);

        if (!response.ok) throw new Error("Proyecto no encontrado");

        const project = await response.json();
        console.log("Datos cargados:", project);

        // 3. Rellenar la vista
        fillDashboard(project);
        setupUpload(projectId, project);
        setupPDF(project);

    } catch (error) {
        console.error(error);
        document.querySelector('.board-container').innerHTML =
            `<div style="text-align:center; padding:50px; color:red;">
                <h2>Error cargando el proyecto</h2>
                <p>${error.message}</p>
                <button class="btn" onclick="window.location.href='/user'">Volver</button>
            </div>`;
    }
});

function fillDashboard(project) {
    // Textos
    document.getElementById('p-name').textContent = project.name;
    document.getElementById('p-manager').textContent = "Responsable: " + (project.manager || "N/A");
    document.getElementById('p-status').textContent = project.status;
    document.getElementById('p-deadline').textContent = "Entrega: " + (project.deadline || "Pendiente");
    document.getElementById('p-desc').textContent = project.description || "Sin descripción.";
    document.getElementById('p-display-id').textContent = project.displayId || `#${project.id}`;

    // Presupuesto
    const fmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
    document.getElementById('budget-total').textContent = fmt.format(project.budget || 0);
    document.getElementById('budget-spent').textContent = fmt.format(project.spent || 0);

    // Tareas
    const taskContainer = document.getElementById('task-list-container');
    taskContainer.innerHTML = '';
    if(project.tasks && project.tasks.length > 0) {
        project.tasks.forEach(t => {
            taskContainer.innerHTML += `
                <li class="task-item">
                    <span>${t.name}</span>
                    <span class="task-priority priority-${t.priority}">${t.priority}</span>
                </li>`;
        });
    } else {
        taskContainer.innerHTML = '<li style="color:#999; padding:10px;">No hay tareas pendientes.</li>';
    }

    // Riesgos
    const riskContainer = document.getElementById('risk-list-container');
    riskContainer.innerHTML = '';
    if(project.risks && project.risks.length > 0) {
        project.risks.forEach(r => {
            riskContainer.innerHTML += `
                <div style="background:#fff5f5; border-left:4px solid #c53030; padding:10px; margin-bottom:10px;">
                    <strong>${r.name}</strong><br><small>${r.desc}</small>
                </div>`;
        });
    } else {
        riskContainer.innerHTML = '<span style="color:green; font-weight:bold;">✅ Sin riesgos detectados</span>';
    }

    // Archivos
    renderFiles(project.files || []);

    // Gráficos (Chart.js)
    renderCharts(project);
}

function renderCharts(project) {
    if (typeof Chart === 'undefined') return;

    // Estado (Donut)
    new Chart(document.getElementById('statusChart'), {
        type: 'doughnut',
        data: {
            labels: ['Completado', 'Pendiente'],
            datasets: [{
                data: [project.progress, 100 - project.progress],
                backgroundColor: ['#2563eb', '#e5e7eb'],
                borderWidth: 0
            }]
        },
        options: { cutout: '75%', plugins: { legend: { position: 'bottom' } } }
    });

    // Rendimiento (Barras)
    new Chart(document.getElementById('performanceChart'), {
        type: 'bar',
        data: {
            labels: ['Finanzas'],
            datasets: [
                { label: 'Gastado', data: [project.spent || 0], backgroundColor: '#dc2626' },
                { label: 'Total', data: [project.budget || 0], backgroundColor: '#2563eb' }
            ]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });
}

function renderFiles(files) {
    const container = document.getElementById('files-list');
    container.innerHTML = '';
    if(!files || files.length === 0) {
        container.innerHTML = '<p class="muted" style="grid-column: 1/-1; text-align: center;">Sin archivos subidos.</p>';
        return;
    }

    files.forEach(f => {
        container.innerHTML += `
            <a href="${f.url}" target="_blank" class="file-item">
                <div style="font-size:2em">📄</div>
                <div style="font-weight:bold; font-size:0.8em; overflow:hidden; text-overflow:ellipsis;">${f.name}</div>
            </a>`;
    });
}

function setupUpload(id, project) {
    const input = document.getElementById('file-input');
    document.getElementById('upload-trigger').onclick = () => input.click();

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if(!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/upload/${id}`, { method: 'POST', body: formData });
            const data = await res.json();
            if(data.success) {
                alert("✅ Archivo subido");
                if(!project.files) project.files = [];
                project.files.push(data.file);
                renderFiles(project.files);
            }
        } catch(err) { alert("Error al subir"); }
    };
}

function setupPDF(project) {
    document.getElementById('btn-pdf').onclick = () => {
        const el = document.getElementById('pdf-content');
        html2pdf().set({
            margin: 10,
            filename: `Reporte_${project.name}.pdf`,
            html2canvas: { scale: 2 },
            jsPDF: { format: 'a4' }
        }).from(el).save();
    };
}