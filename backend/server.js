const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/src', express.static(path.join(__dirname, '../frontend/src')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- RUTAS DE ARCHIVOS JSON ---
const projectsFile = path.join(__dirname, 'projects.json');
const usersFile = path.join(__dirname, 'users.json');

// --- HELPERS PARA LEER/ESCRIBIR ---
function readJSON(file) {
    if (!fs.existsSync(file)) return [];
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) { return []; }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- CONFIGURACIÓN MULTER (Archivos) ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ================= API USUARIOS =================

// 1. Obtener todos los usuarios
app.get('/api/users', (req, res) => {
    const users = readJSON(usersFile);
    // Por seguridad, no devolvemos contraseñas
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
});

// 2. Eliminar usuario
app.delete('/api/users/:id', (req, res) => {
    let users = readJSON(usersFile);
    const initialLength = users.length;
    // Usamos != para que coincida aunque uno sea string y otro number
    users = users.filter(u => u.id != req.params.id);

    if (users.length < initialLength) {
        writeJSON(usersFile, users);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Usuario no encontrado" });
    }
});

// 3. Login
app.post('/api/users/login', (req, res) => {
    const { email, password } = req.body;
    const users = readJSON(usersFile);
    const user = users.find(u => u.email === email && u.password === password);
    if (user) res.json({ success: true, user });
    else res.status(401).json({ success: false, message: "Credenciales incorrectas" });
});

// 4. Registro
app.post('/api/users/register', (req, res) => {
    const users = readJSON(usersFile);
    const { username, email, password } = req.body;

    if (users.find(u => u.email === email)) {
        return res.status(400).json({ message: "Usuario ya existe" });
    }

    const newUser = {
        id: Date.now(),
        username,
        email,
        password,
        role: 'user',
        joined: new Date().toISOString().split('T')[0]
    };

    users.push(newUser);
    writeJSON(usersFile, users);
    res.json({ success: true, user: newUser });
});

// ================= API PROYECTOS (CRUD COMPLETO) =================

// 1. LEER TODOS
app.get('/api/projects', (req, res) => res.json(readJSON(projectsFile)));

// 2. LEER UNO
app.get('/api/projects/:id', (req, res) => {
    // Usamos == para comparar string (url) con number (json)
    const project = readJSON(projectsFile).find(p => p.id == req.params.id);
    project ? res.json(project) : res.status(404).json({error: "No encontrado"});
});

// 3. CREAR PROYECTO
app.post('/api/projects', (req, res) => {
    const projects = readJSON(projectsFile);
    const newProject = {
        id: Date.now(),
        displayId: `PRJ-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`,
        ...req.body,
        files: [],
        progress: 0,
        spent: 0
    };

    projects.push(newProject);
    writeJSON(projectsFile, projects);
    res.json({ success: true, project: newProject });
});

// 4. EDITAR PROYECTO (CORREGIDO)
app.put('/api/projects/:id', (req, res) => {
    const projects = readJSON(projectsFile);
    // CORREGIDO: Usar == para encontrar el ID aunque venga como texto
    const index = projects.findIndex(p => p.id == req.params.id);

    if (index !== -1) {
        projects[index] = {
            ...projects[index],
            ...req.body,
            id: projects[index].id, // Asegurar ID original
            files: projects[index].files // Asegurar archivos
        };
        writeJSON(projectsFile, projects);
        res.json({ success: true, project: projects[index] });
    } else {
        res.status(404).json({ error: "Proyecto no encontrado" });
    }
});

// 5. BORRAR PROYECTO (CORREGIDO)
app.delete('/api/projects/:id', (req, res) => {
    let projects = readJSON(projectsFile);
    const initialLength = projects.length;
    // CORREGIDO: Usar !=
    projects = projects.filter(p => p.id != req.params.id);

    if (projects.length < initialLength) {
        writeJSON(projectsFile, projects);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "No encontrado" });
    }
});

// 6. SUBIR ARCHIVO
app.post('/api/upload/:id', upload.single('file'), (req, res) => {
    const projects = readJSON(projectsFile);
    // CORREGIDO: Usar ==
    const index = projects.findIndex(p => p.id == req.params.id);
    if (index !== -1 && req.file) {
        if(!projects[index].files) projects[index].files = [];
        projects[index].files.push({
            id: Date.now(),
            name: req.file.originalname,
            url: '/uploads/' + req.file.filename,
            date: new Date().toLocaleDateString()
        });
        writeJSON(projectsFile, projects);
        res.json({ success: true });
    } else res.status(400).json({ error: "Error" });
});

// 7. BORRAR ARCHIVO
app.delete('/api/upload/:pid/:fid', (req, res) => {
    const projects = readJSON(projectsFile);
    // CORREGIDO: Usar ==
    const pIndex = projects.findIndex(p => p.id == req.params.pid);
    if(pIndex !== -1) {
        projects[pIndex].files = projects[pIndex].files.filter(f => f.id != req.params.fid);
        writeJSON(projectsFile, projects);
        res.json({success: true});
    } else res.status(404).json({error: "No encontrado"});
});

// ================= RUTAS VISTAS =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/register.html')));
app.get('/user', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/user.html')));
app.get('/tablero', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/tablero.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/admin.html')));

app.listen(PORT, () => console.log(`🚀 Servidor Admin listo en: http://localhost:${PORT}`));