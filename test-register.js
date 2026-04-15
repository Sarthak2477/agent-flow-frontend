const url = 'https://unwholesomely-proanarchy-bud.ngrok-free.dev/api/v1/auth/register';

fetch(url, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'sarth' + Date.now() + '@example.com', password: 'password123' })
})
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(console.log)
    .catch(console.error);
