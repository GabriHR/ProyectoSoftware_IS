// backend/db.js
const fs = require('fs');
const path = require('path');

// El archivo se creará en la carpeta 'backend'
const dbPath = path.join(__dirname, 'database.json');

// Inicializar DB si no existe
const initDB = () => {
    if (!fs.existsSync(dbPath)) {
        const initialData = {
            users: [],
            tasks: []
        };
        fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
        console.log("Archivo database.json creado.");
    }
};

const readData = () => {
    initDB(); // Aseguramos que exista antes de leer
    const jsonData = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(jsonData);
};

const writeData = (data) => {
    // El 'null, 2' hace que el JSON se vea bonito y ordenado
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

module.exports = { readData, writeData };