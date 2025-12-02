const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;

// --- CONFIGURACIÓN ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/src', express.static(path.join(__dirname, '../frontend/src')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de subida de archivos (Multer)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// --- GESTIÓN DE BASE DE DATOS SEGURA ---
const projectsFile = path.join(__dirname, 'projects.json');

// Función auxiliar para leer datos sin que explote el servidor
function getProjectsSafe() {
    if (!fs.existsSync(projectsFile)) {
        // Si no existe, devolvemos array vacío
        return [];
    }
    try {
        const data = fs.readFileSync(projectsFile, 'utf-8');
        return JSON.parse(data) || [];
    } catch (error) {
        console.error("Error leyendo JSON:", error);
        return [];
    }
}

// --- RUTAS API ---

// 1. OBTENER PROYECTOS
app.get('/api/projects', (req, res) => {
    res.json(getProjectsSafe());
});

// 2. OBTENER UN PROYECTO
app.get('/api/projects/:id', (req, res) => {
    const projects = getProjectsSafe();
    const project = projects.find(p => p.id == req.params.id);
    if(project) res.json(project);
    else res.status(404).json({error: "No encontrado"});
});

// 3. CREAR PROYECTO (La que te estaba fallando)
app.post('/api/projects', (req, res) => {
    try {
        const projects = getProjectsSafe();
        const newProject = req.body;

        // Asignamos ID y valores por defecto
        newProject.id = Date.now();
        newProject.displayId = `PRJ-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`;
        newProject.files = [];
        newProject.members = [];
        newProject.risks = [];
        newProject.tasks = [];
        newProject.progress = 0;
        newProject.budget = 0;
        newProject.spent = 0;

        // Guardamos
        projects.push(newProject);
        fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));

        console.log("✅ Proyecto creado:", newProject.name);
        res.json({ success: true, project: newProject });
    } catch (error) {
        console.error("❌ Error guardando proyecto:", error);
        res.status(500).json({ message: "Error interno al guardar" });
    }
});

// 4. SUBIR ARCHIVO
app.post('/api/upload/:id', upload.single('file'), (req, res) => {
    try {
        const projects = getProjectsSafe();
        const index = projects.findIndex(p => p.id === req.params.id);

        if (index !== -1 && req.file) {
            if(!projects[index].files) projects[index].files = [];
            projects[index].files.push({
                name: req.file.originalname,
                url: '/uploads/' + req.file.filename,
                date: new Date().toLocaleDateString()
            });
            fs.writeFileSync(projectsFile, JSON.stringify(projects, null, 2));
            res.json({ success: true, file: projects[index].files.slice(-1)[0] });
        } else {
            res.status(400).json({ error: "Proyecto no encontrado o falta archivo" });
        }
    } catch (e) { res.status(500).json({error: "Error subida"}); }
});

// --- VISTAS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/register.html')));
app.get('/user', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/user.html')));
app.get('/tablero', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/tablero.html')));

app.listen(PORT, () => console.log(`🚀 SERVIDOR LISTO: http://localhost:${PORT}`));