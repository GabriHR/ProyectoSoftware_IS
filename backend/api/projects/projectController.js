const projectModel = require('./projectModel');

const getProjects = (req, res) => {
    try {
        const projects = projectModel.getAllProjects();
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ message: "Error al leer proyectos" });
    }
};

module.exports = { getProjects };