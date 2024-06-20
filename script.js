const socket = io('http://localhost:3000'); 
socket.on('connect', function() {
    console.log('Connected to server');
});
socket.on('disconnect', function() {
    console.log('Disconnected from server');
});

const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('message');
const sendButton = document.getElementById('send');
const output = document.getElementById('output');


socket.on('connect', () => {
    console.log('Conectado al servidor de Socket.io');
});


sendButton.addEventListener('click', () => {
    const username = usernameInput.value;
    const message = messageInput.value;
    if (username && message) {
        socket.emit('sendMessage', { username, message });
        messageInput.value = '';
    }
});

socket.on('newMessage', (data) => {
    output.innerHTML += `<p style="color: white"><strong>${data.username}:</strong> ${data.message}</p>`;
});

