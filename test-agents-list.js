const url = 'https://unwholesomely-proanarchy-bud.ngrok-free.dev/api/v1/agents';

fetch(url, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        // Using a dummy token or one from earlier run
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyYzkwYmVlZi1mYzE0LTQ0ZGUtOTY0OC03NzJmYjlkNWYxNzYiLCJlbWFpbCI6InNhcnRoMTc3NDg2OTU3MzE2M0BleGFtcGxlLmNvbSIsImlhdCI6MTc3NDg2OTYwMCwiZXhwIjoxNzc1NDc0NDAwfQ.mGCeSKFqwdBt12slgPCsyi-LQPg0UyZoHJprkC0aWSQ'
    }
})
    .then(res => res.json())
    .then(console.log)
    .catch(console.error);
