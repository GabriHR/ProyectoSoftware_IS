const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./api/user/userRoutes'); // Asegúrate de que esta ruta sea correcta según tu estructura

const app = express();
const PORT = 3000;

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// "Chivato": Esto imprimirá en la consola qué archivo está pidiendo el navegador
app.use((req, res, next) => {
    console.log(`📡 Petición recibida: ${req.method} ${req.url}`);
    next();
});

// --- ARCHIVOS ESTÁTICOS ---
app.use('/css', express.static(path.join(__dirname, '../frontend/public/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/public/js')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// --- RUTAS API ---
app.use('/api/users', userRoutes);

// --- RUTA PRINCIPAL (LOGIN) ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/html/login.html'));
});

// --- RUTA REGISTRO (Por si alguien escribe localhost:3000/register) ---
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/html/register.html'));
});

// --- RUTA DASHBOARD (Por si alguien escribe localhost:3000/index) ---
app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/html/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en: http://localhost:${PORT}`);
});