// backend/api/projects/projectRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Apuntamos al archivo projects.json que acabas de crear
const dbPath = path.join(__dirname, '../../projects.json');

router.get('/', (req, res) => {
    // Leemos el archivo JSON
    fs.readFile(dbPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error leyendo projects.json:", err);
            // Si el archivo no existe, devolvemos array vacío en vez de error
            return res.json([]);
        }
        try {
            const projects = JSON.parse(data);
            res.json(projects);
        } catch (parseError) {
            console.error("Error procesando JSON:", parseError);
            res.status(500).json({ message: "Error de datos" });
        }
    });
});

module.exports = router;