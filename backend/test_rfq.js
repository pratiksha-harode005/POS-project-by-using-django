const axios = require('axios');
axios.post('http://localhost:8000/api/rfq/', {
    title: 'Test',
    deadline: '2026-10-10',
    terms: 'Standalone',
    status: 'New',
    purchase_request: null,
    invited_vendors: ['Dell']
}, {
    headers: { 'Authorization': 'Token c394ec3bc723dcbc84a323db17117d3d1964257f' }
}).then(res => console.log(res.data)).catch(err => console.error(err.response ? err.response.data : err.message));
