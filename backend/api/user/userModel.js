// backend/api/userModel.js
const { readData, writeData } = require('/backend/db'); // Asumo que exportas estas funciones

const getAllUsers = () => {
    const data = readData();
    return data.users || [];
};

const findUserByEmail = (email) => {
    const users = getAllUsers();
    return users.find(user => user.email === email);
};

const createUser = (newUser) => {
    const data = readData();

    // Asignamos un ID simple (en producción usarías UUID)
    const newId = data.users.length > 0 ? data.users[data.users.length - 1].id + 1 : 1;

    const userToSave = {
        id: newId,
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        role: 'user' // Por defecto, los nuevos son empleados normales
    };

    data.users.push(userToSave);
    writeData(data);
    return userToSave;
};

module.exports = { getAllUsers, findUserByEmail, createUser };