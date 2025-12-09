const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ================= ARCHIVOS ESTÁTICOS =================
// (El orden importa: assets específicos primero, luego carpetas generales)
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));
app.use(express.static(path.join(__dirname, '../frontend/public')));
app.use('/src', express.static(path.join(__dirname, '../frontend/src')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================= CONFIGURACIÓN Y PERSISTENCIA ROBUSTA =================
const uploadsDir = path.join(__dirname, 'uploads');
const projectsFile = path.join(__dirname, 'projects.json');
const usersFile = path.join(__dirname, 'users.json');

// 1. Asegurar carpeta de subidas
if (!fs.existsSync(uploadsDir)) {
    console.log("📂 Creando carpeta 'uploads'...");
    fs.mkdirSync(uploadsDir);
}

// 2. Asegurar archivo de USUARIOS con ADMIN por defecto
if (!fs.existsSync(usersFile)) {
    console.log("👤 Creando users.json con Admin por defecto...");
    const defaultUsers = [{
        id: 1,
        username: "Admin",
        email: "admin@taskflow.com",
        password: "admin",
        role: "admin",
        joined: new Date().toISOString().split('T')[0]
    }];
    fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2));
}

// 3. Asegurar archivo de PROYECTOS vacío
if (!fs.existsSync(projectsFile)) {
    console.log("📋 Creando projects.json vacío...");
    fs.writeFileSync(projectsFile, JSON.stringify([], null, 2));
}

// --- HELPERS PARA LEER/ESCRIBIR ---
function readJSON(file) {
    try {
        const data = fs.readFileSync(file, 'utf-8');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error(`Error leyendo ${file}:`, e.message);
        return [];
    }
}

function writeJSON(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`Error escribiendo en ${file}:`, e.message);
        return false;
    }
}

// Configuración Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        // Limpiamos el nombre de espacios para evitar problemas en URL
        const safeName = file.originalname.replace(/\s+/g, '-');
        cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({ storage });


// ================= API USUARIOS =================

app.get('/api/users', (req, res) => {
    const users = readJSON(usersFile);
    // Devolvemos usuarios sin contraseña por seguridad
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
});

app.delete('/api/users/:id', (req, res) => {
    let users = readJSON(usersFile);
    const initialLength = users.length;
    // Usamos!= para permitir borrar aunque el ID venga como string
    users = users.filter(u => u.id != req.params.id);

    if (users.length < initialLength) {
        writeJSON(usersFile, users);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Usuario no encontrado" });
    }
});

app.post('/api/users/login', (req, res) => {
    const { email, password } = req.body;
    const users = readJSON(usersFile);
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } else {
        res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }
});

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
        role: 'user', // Por defecto
        joined: new Date().toISOString().split('T')[0]
    };

    users.push(newUser);
    writeJSON(usersFile, users);
    res.json({ success: true, user: newUser });
});


// ================= API PROYECTOS =================

app.get('/api/projects', (req, res) => res.json(readJSON(projectsFile)));

app.get('/api/projects/:id', (req, res) => {
    // Usamos == para comparar string con number
    const project = readJSON(projectsFile).find(p => p.id == req.params.id);
    project ? res.json(project) : res.status(404).json({error: "No encontrado"});
});

// Crear Proyecto
app.post('/api/projects', (req, res) => {
    const projects = readJSON(projectsFile);
    const newProject = {
        id: Date.now(),
        displayId: `PRJ-${new Date().getFullYear()}-${Math.floor(Math.random()*1000)}`,
        ...req.body,
        files: [], progress: 0, spent: 0
    };

    projects.push(newProject);
    writeJSON(projectsFile, projects);
    res.json({ success: true, project: newProject });
});

// Editar Proyecto
app.put('/api/projects/:id', (req, res) => {
    const projects = readJSON(projectsFile);
    const index = projects.findIndex(p => p.id == req.params.id);

    if (index !== -1) {
        projects[index] = {
            ...projects[index], // Mantener ID y archivos
            ...req.body,        // Sobrescribir datos nuevos
            id: projects[index].id,
            files: projects[index].files
        };
        writeJSON(projectsFile, projects);
        res.json({ success: true, project: projects[index] });
    } else {
        res.status(404).json({ error: "Proyecto no encontrado" });
    }
});

// Eliminar Proyecto
app.delete('/api/projects/:id', (req, res) => {
    let projects = readJSON(projectsFile);
    const initialLength = projects.length;
    projects = projects.filter(p => p.id != req.params.id);

    if (projects.length < initialLength) {
        writeJSON(projectsFile, projects);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "No encontrado" });
    }
});

// Subir Archivo
app.post('/api/upload/:id', upload.single('file'), (req, res) => {
    const projects = readJSON(projectsFile);
    const index = projects.findIndex(p => p.id == req.params.id);

    if (index !== -1 && req.file) {
        if(!projects[index].files) projects[index].files = [];

        projects[index].files.push({
            id: Date.now(),
            name: req.file.originalname,
            url: '/uploads/' + req.file.filename,
            serverName: req.file.filename,
            date: new Date().toLocaleDateString()
        });

        writeJSON(projectsFile, projects);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Error al subir" });
    }
});

// Borrar Archivo
app.delete('/api/upload/:pid/:fid', (req, res) => {
    const projects = readJSON(projectsFile);
    const pIndex = projects.findIndex(p => p.id == req.params.pid);

    if(pIndex !== -1) {
        const fileObj = projects[pIndex].files.find(f => f.id == req.params.fid);

        // Borrar del disco físico si existe
        if (fileObj && fileObj.serverName) {
            const filePath = path.join(uploadsDir, fileObj.serverName);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch(e) { console.error("Error borrando archivo físico:", e); }
            }
        }

        // Borrar del JSON
        projects[pIndex].files = projects[pIndex].files.filter(f => f.id != req.params.fid);
        writeJSON(projectsFile, projects);
        res.json({success: true});
    } else {
        res.status(404).json({error: "No encontrado"});
    }
});


// ================= RUTAS VISTAS =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/register.html')));
app.get('/user', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/user.html')));
app.get('/tablero', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/tablero.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../frontend/public/html/admin.html')));

app.listen(PORT, () => console.log(`🚀 Servidor listo en: http://localhost:${PORT}`));