const urls = [
    'https://unwholesomely-proanarchy-bud.ngrok-free.dev/api/v1/github/repos',
    'https://unwholesomely-proanarchy-bud.ngrok-free.dev/api/v1/deploy'
];

async function test() {
    for (const url of urls) {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyYzkwYmVlZi1mYzE0LTQ0ZGUtOTY0OC03NzJmYjlkNWYxNzYiLCJlbWFpbCI6InNhcnRoMTc3NDg2OTU3MzE2M0BleGFtcGxlLmNvbSIsImlhdCI6MTc3NDg2OTYwMCwiZXhwIjoxNzc1NDc0NDAwfQ.mGCeSKFqwdBt12slgPCsyi-LQPg0UyZoHJprkC0aWSQ'
            }
        });
        const data = await res.json();
        console.log(url, { status: res.status, data });
    }
}
test().catch(console.error);
