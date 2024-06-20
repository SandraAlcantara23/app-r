const express = require('express');
const mysql = require('mysql');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');

// Crear la aplicación Express
const app = express();
app.use(express.json());

// Crear el servidor HTTP y configurar Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configurar pool de conexiones a MySQL
const db = mysql.createPool({
    connectionLimit: 20, // Asegúrate de que el límite del pool no exceda el límite del usuario
    host: 'bfbra5eeuib81qgrygqu-mysql.services.clever-cloud.com',
    user: 'ugbzbtyw6ij3qsyz',
    password: 'ajbM6OaXZB3EdiprMUWK',
    port: 3306,
    database: 'bfbra5eeuib81qgrygqu'
});

db.on('connection', function (connection) {
    console.log('DB Connection established');

    connection.on('error', function (err) {
        console.error(new Date(), 'MySQL error', err.code);
    });
    connection.on('close', function (err) {
        console.error(new Date(), 'MySQL close', err);
    });
});

app.use(cors());


// Middleware para parsear JSON
app.use(express.json());

// Ruta para el endpoint raíz
app.get('/', (req, res) => {
    // Consulta para obtener usuarios
    db.query('SELECT * FROM messages', (errorUsuarios, resultsUsuarios) => {
        if (errorUsuarios) {
            return res.status(500).json({ message: errorUsuarios.message || "No se pueden obtener datos de la tabla usuarios" });
        }

        // Consulta para obtener mensajes
        db.query('SELECT * FROM messages', (errorMessages, resultsMessages) => {
            if (errorMessages) {
                return res.status(500).json({ message: errorMessages.message || "No se pueden obtener datos de la tabla messages" });
            }

            // Enviar usuarios y mensajes como respuesta
            res.status(200).json({
                username: resultsUsuarios,
                message: resultsMessages
            });
        });
    });
});

// Ruta para obtener datos de la tabla usuarios
app.get("/usuarios", (req, res) => {
    db.query("SELECT * FROM messages", (error, results) => {
        if (error) res.status(500).json({ message: error.message || "No se pueden obtener datos en este momento para la tabla usuarios" });
        else res.status(200).json(results);
    });
});

// Ruta para insertar datos en la tabla usuarios
app.post("/usuarios", (req, res) => {
    const { nombre } = req.body;
    db.query('INSERT INTO messages (nombre) VALUES (?)', [nombre], (error, results) => {
        if (error) res.status(500).json({ message: error.message || "No se pudo insertar el dato en este momento" });
        else res.json(results);
    });
});

// Manejar la conexión de Socket.io
io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

    socket.on('sendMessage', (data) => {
        const { username, message } = data;

        if (!username || !message) {
            socket.emit('errorMessage', 'Faltan campos requeridos');
            return;
        }

        const query = 'INSERT INTO messages (username, message) VALUES (?, ?)';
        db.query(query, [username, message], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.error('Error al insertar el mensaje en la base de datos: Entrada duplicada');
                    socket.emit('errorMessage', 'Nombre de usuario duplicado');
                } else {
                    console.error('Error al insertar el mensaje en la base de datos:', err.message);
                    socket.emit('errorMessage', 'Error al guardar el mensaje');
                }
                return;
            }
            io.emit('newMessage', { id: result.insertId, username, message });
        });
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Algo salió mal');
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
