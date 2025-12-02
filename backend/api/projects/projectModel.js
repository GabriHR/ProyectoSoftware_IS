const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../../projects.json');

const getAllProjects = () => {
    if (!fs.existsSync(dbPath)) {
        return []; // Si no existe, devuelve array vacío
    }
    const jsonData = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(jsonData);
};

module.exports = { getAllProjects };