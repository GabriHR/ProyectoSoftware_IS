// backend/api/userController.js
const { readData, writeData } = require('../../db.js'); // Importamos las funciones que tocan el archivo

// --- LOGICA DE REGISTRO ---
const register = (req, res) => {
    const { username, email, password } = req.body;

    // 1. Validar que lleguen datos
    if (!username || !email || !password) {
        return res.status(400).json({ message: "Faltan datos" });
    }

    // 2. Leer el archivo JSON actual
    const data = readData();

    // 3. Chequear si ya existe el email
    if (data.users.find(u => u.email === email)) {
        return res.status(400).json({ message: "El usuario ya existe" });
    }

    // 4. Crear el nuevo usuario
    const newUser = {
        id: Date.now(), // Usamos la fecha como ID único
        username,
        email,
        password, // Recuerda: En la vida real esto se encripta
        role: 'user'
    };

    // 5. ¡AQUÍ SE GUARDA! Añadimos al array y sobrescribimos el archivo
    data.users.push(newUser);
    writeData(data);

    // 6. Respondemos "T odo OK"
    res.status(201).json({ success: true, message: "Usuario registrado" });
};

// --- LOGICA DE LOGIN ---
const login = (req, res) => {
    const { email, password } = req.body;

    // 1. Leer el JSON actualizado (con el usuario que acabas de crear)
    const data = readData();

    // 2. Buscar coincidencia
    const user = data.users.find(u => u.email === email && u.password === password);

    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, message: "Credenciales incorrectas" });
    }
};

module.exports = { register, login };