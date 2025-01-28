const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());
app.use(express.static('public'));
// Servir faker desde node_modules
app.use('/faker', express.static(path.join(__dirname, 'node_modules/@faker-js/faker/dist')));

// Nueva configuraci贸n
const COUNTRY_COORDINATES = {
    'es': [{ lat: 40.4168, lng: -3.7038 }, { lat: 41.3851, lng: 2.1734 }],
    'mx': [{ lat: 19.4326, lng: -99.1332 }, { lat: 20.6597, lng: -103.3496 }],
    'ar': [{ lat: -34.6037, lng: -58.3816 }, { lat: -31.4201, lng: -64.1888 }],
    'co': [{ lat: 4.7110, lng: -74.0721 }, { lat: 6.2442, lng: -75.5812 }],
    'pe': [{ lat: -12.057481, lng: -77.036545 }, { lat: -11.867044, lng: -77.131302 }],
    'uk': [{ lat: 51.5074, lng: -0.1278 }, { lat: 53.4808, lng: -2.2426 }],
    'us': [{ lat: 40.7128, lng: -74.0060 }, { lat: 34.0522, lng: -118.2437 }]
};

const COUNTRY_NAMES = {
    'es': 'España',
    'mx': 'Mexico',
    'ar': 'Argentina',
    'co': 'Colombia',
    'pe': 'Peru',
    'uk': 'Reino Unido',
    'us': 'Estados Unidos'
};

async function getRandomAddress(country) {
    const countryCode = country.toLowerCase();
    const coords = COUNTRY_COORDINATES[countryCode] || COUNTRY_COORDINATES['co'];
    const randomCity = coords[Math.floor(Math.random() * coords.length)];
    
    const lat = randomCity.lat + (Math.random() - 0.5) * 0.1;
    const lng = randomCity.lng + (Math.random() - 0.5) * 0.1;

    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'Aeolous Address Generator' } }
    );
    
    const data = await response.json();
    return data.address;
}

// Endpoint modificado
app.post('/generate-addresses', async (req, res) => {
    try {
        const { country, count } = req.body;
        const countryCode = country.toLowerCase();
        const addresses = [];
        const limit = Math.min(parseInt(count) || 1, 10);

        for (let i = 0; i < limit; i++) {
            try {
                // Obtener datos de usuario
                const userRes = await fetch('https://randomuser.me/api/');
                const userData = await userRes.json();
                const user = userData.results[0];
                
                // Generar direcci贸n
                const addressData = await getRandomAddress(countryCode);
                const address = {
                    street: `${addressData.house_number || ''} ${addressData.road || ''}`.trim(),
                    city: addressData.city || addressData.town || addressData.village || 'Ciudad Desconocida',
                    state: addressData.state || addressData.region || 'Estado Desconocido',
                    zipCode: addressData.postcode || '00000',
                    country: COUNTRY_NAMES[countryCode] || 'Pa铆s Desconocido'
                };

                // Datos adicionales
                const name = `${user.name.first} ${user.name.last}`;
                const phone = `+${user.cell.replace(/\D/g, '')}`;

                addresses.push({ ...address, name, phone, gender: user.gender });
            } catch (error) {
                console.error('Error generando direcci贸n:', error);
                addresses.push({
                    street: 'Calle Desconocida',
                    city: 'Ciudad Desconocida',
                    state: 'Estado Desconocido',
                    zipCode: '00000',
                    country: 'Pa铆s Desconocido',
                    name: 'Nombre Desconocido',
                    phone: '+000000000',
                    gender: 'unknown'
                });
            }
        }

        res.json({ success: true, addresses });
    } catch (error) {
        console.error('Error general:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error al generar direcciones',
            message: error.message 
        });
    }
});

// Funci贸n de validaci贸n Luhn
function luhnCheck(cardNumber) {
    let sum = 0;
    let isEven = false;
    
    // Remover espacios y guiones
    cardNumber = cardNumber.replace(/\s|-/g, '');
    
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i]);
        
        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        
        sum += digit;
        isEven = !isEven;
    }
    
    return sum % 10 === 0;
}

// Funci贸n para obtener el tipo de tarjeta
function getCardType(cardNumber) {
    const patterns = {
        visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
        mastercard: /^5[1-5][0-9]{14}$/,
        amex: /^3[47][0-9]{13}$/,
        discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/
    };
    
    for (let [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(cardNumber)) {
            return type.toUpperCase();
        }
    }
    return 'UNKNOWN';
}

// Basic Checker
app.post('/api/basic/check', async (req, res) => {
    console.log('Basic check request received');
    try {
        const { cards } = req.body;
        if (!cards || !Array.isArray(cards)) {
            return res.status(400).json({ success: false, error: 'Invalid request' });
        }

        const results = await Promise.all(cards.map(async (card) => {
            try {
                const response = await fetch(`https://xchecker.cc/api.php?cc=${encodeURIComponent(card)}`);
                const data = await response.json();
                await new Promise(r => setTimeout(r, 200));
                return {
                    card,
                    status: data.status,
                    message: `${data.status} | ${(data.details || 'Card Declined').replace(/Please consider making a donation[\s\S]*?bc1[^\s]+/gi, '')} | .gg/aeolous`
                };
            } catch (error) {
                return {
                    card,
                    status: 'Dead',
                    message: 'Card Declined | .gg/aeolous'
                };
            }
        }));

        res.json({ success: true, results });

    } catch (error) {
        console.error('Basic check error:', error);
        res.status(500).json({
            success: false,
            error: 'Gateway Error'
        });
    }
});

// Pro Checker
app.post('/api/pro/check', async (req, res) => {
    console.log('Pro check request received');
    try {
        const { cards } = req.body;
        if (!cards || !Array.isArray(cards)) {
            return res.status(400).json({ success: false, error: 'Invalid request' });
        }

        const results = await Promise.all(cards.map(async (card) => {
            try {
                // Normalizar formato de fecha
                const [cc, month, year, cvv] = card.split('|');
                const fullYear = year.length === 2 ? '20' + year : year;
                const normalizedCard = `${cc}|${month}|${fullYear}|${cvv}`;

                console.log('Sending request to API:', normalizedCard);

                console.log('Request details:', {
                    method: 'POST',
                    url: 'https://api.chkr.cc/',
                    headers: {
                        'authority': 'api.chkr.cc',
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'Accept-Language': 'es,en-US;q=0.9,en;q=0.8',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.57',
                        'Origin': 'https://chkr.cc',
                        'Referer': 'https://chkr.cc/',
                        'sec-ch-ua': '"Chromium";v="118", "Microsoft Edge";v="118", "Not=A?Brand";v="99"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'cross-site'
                    },
                    body: new URLSearchParams({
                        'data': normalizedCard,
                        'charge': false,
                        'type': 'event',
                        'payload[website]': '38220560-ca8a-4a14-b042-5525d1071447',
                        'payload[hostname]': 'chkr.cc',
                        'payload[screen]': '1920x1080',
                        'payload[language]': 'es'
                    }).toString()
                });

                const response = await fetch('https://api.chkr.cc/', {
                    method: 'POST',
                    headers: {
                        'authority': 'api.chkr.cc',
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'Accept-Language': 'es,en-US;q=0.9,en;q=0.8',
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.57',
                        'Origin': 'https://chkr.cc',
                        'Referer': 'https://chkr.cc/',
                        'sec-ch-ua': '"Chromium";v="118", "Microsoft Edge";v="118", "Not=A?Brand";v="99"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                        'sec-fetch-dest': 'empty',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-site': 'cross-site'
                    },
                    body: new URLSearchParams({
                        'data': normalizedCard,
                        'charge': false,
                        'type': 'event',
                        'payload[website]': '38220560-ca8a-4a14-b042-5525d1071447',
                        'payload[hostname]': 'chkr.cc',
                        'payload[screen]': '1920x1080',
                        'payload[language]': 'es'
                    }).toString()
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const textResponse = await response.text();
                console.log('Raw API Response:', textResponse);

                let data;
                try {
                    data = JSON.parse(textResponse);
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    throw new Error('Invalid JSON response');
                }

                console.log('Parsed API Response:', data);

                await new Promise(r => setTimeout(r, 300));
                
                // Verificaci贸n m谩s detallada del status
                const isLive = data.code === 1;
                
                return {
                    card,
                    status: isLive ? 'Live' : 'Dead',
                    message: `${data.status} | ${(data.message || 'Card Declined').replace(/\[GATE_01@chkr\.cc\]/g, '')} | Bank: ${data.card?.bank || 'N/A'} | Type: ${data.card?.type || 'N/A'} | Country: ${data.card?.country?.name || 'N/A'} | .gg/aeolous`
                };
            } catch (error) {
                console.error('Card check error:', error);
                return {
                    card,
                    status: 'Dead',
                    message: 'Card Declined | .gg/aeolous'
                };
            }
        }));

        res.json({ success: true, results });

    } catch (error) {
        console.error('Pro check error:', error);
        res.status(500).json({
            success: false,
            error: 'Gateway Error'
        });
    }
});

// Luhn Checker
app.post('/api/luhn/check', async (req, res) => {
    console.log('Luhn check request received');
    try {
        const { cards } = req.body;
        if (!cards || !Array.isArray(cards)) {
            return res.status(400).json({ success: false, error: 'Invalid request' });
        }

        const results = [];
        for (const card of cards) {
            try {
                const [cardNumber] = card.split('|');
                const isValid = luhnCheck(cardNumber);
                const cardType = getCardType(cardNumber);

                results.push({
                    card,
                    status: isValid ? 'Live' : 'Dead',
                    message: `${isValid ? 'Valid Card' : 'Invalid Card'} | Type: ${cardType} | Luhn Check: ${isValid ? 'Pass' : 'Fail'} | .gg/aeolous`
                });
            } catch (error) {
                results.push({
                    card,
                    status: 'Dead',
                    message: 'Invalid Card Format | .gg/aeolous'
                });
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        res.json({ success: true, results });

    } catch (error) {
        console.error('Luhn check error:', error);
        res.status(500).json({
            success: false,
            error: 'Gateway Error'
        });
    }
});

// Funciones de extrapolaci贸n
function extrapolacionBasica(cc) {
    return `${cc.slice(0, 10)}xxxxxx`;
}

function extrapolacionSimilitud(cc1, cc2) {
    const cc1_group_1 = cc1.slice(0, 10);
    const cc1_group_2 = cc1.slice(10);
    const cc2_group_2 = cc2.slice(10);
    
    let result_group_2 = '';
    for (let i = 0; i < 6; i++) {
        result_group_2 += cc1_group_2[i] !== cc2_group_2[i] ? 'x' : cc1_group_2[i];
    }
    
    return `${cc1_group_1}${result_group_2}`;
}

function extrapolacionLogica(cc) {
    const group1 = cc.slice(0, 6);
    const group2 = cc.slice(6);
    
    if (group2.length < 9) {
        throw new Error("La tarjeta no tiene la longitud suficiente");
    }

    const subgroup1 = group2.slice(0, 3);
    const subgroup2 = group2.slice(3, 7);
    const subgroup3 = group2.slice(7);

    const subgroup1_replaced = subgroup1.length === 3 ? `${subgroup1[0]}x${subgroup1[2]}` : subgroup1;
    const subgroup2_replaced = subgroup2.length === 4 ? `${subgroup2[0]}xx${subgroup2[3]}` : subgroup2;
    const subgroup3_replaced = subgroup3.length >= 3 ? `${subgroup3[0]}x${subgroup3[2]}` : subgroup3;

    return `${group1}${subgroup1_replaced}${subgroup2_replaced}${subgroup3_replaced}`;
}

function extrapolacionSofia(cc1, cc2) {
    if (cc1.length < 16 || cc2.length < 16) {
        throw new Error("Las tarjetas deben tener al menos 16 d铆gitos");
    }
    
    const cc1_grupo1 = cc1.slice(0, 8);
    const cc1_grupo2 = cc1.slice(8);
    const cc2_grupo1 = cc2.slice(0, 8);
    const cc2_grupo2 = cc2.slice(8);
    
    let resultado = '';
    for (let i = 0; i < 8; i++) {
        resultado += (parseInt(cc2_grupo1[i]) * parseInt(cc2_grupo2[i])).toString();
    }
    
    resultado = resultado.slice(0, 8);
    const extrapolacion = `${cc1_grupo1}${resultado}`;
    
    let resultado_final = '';
    for (let i = 0; i < 16; i++) {
        resultado_final += cc1[i] === extrapolacion[i] ? cc1[i] : 'x';
    }
    
    return resultado_final.slice(0, -1) + '1';
}

// Endpoints de extrapolaci贸n
app.post('/api/extrapolacion/basica', (req, res) => {
    try {
        const { cc } = req.body;
        if (!cc || cc.length < 16) {
            return res.status(400).json({ success: false, error: 'Tarjeta inv谩lida' });
        }
        const resultado = extrapolacionBasica(cc);
        res.json({ success: true, resultado });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/extrapolacion/similitud', (req, res) => {
    try {
        const { cc1, cc2 } = req.body;
        if (!cc1 || !cc2 || cc1.length < 16 || cc2.length < 16) {
            return res.status(400).json({ success: false, error: 'Tarjetas inv谩lidas' });
        }
        const resultado = extrapolacionSimilitud(cc1, cc2);
        res.json({ success: true, resultado });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/extrapolacion/logica', (req, res) => {
    try {
        const { cc } = req.body;
        if (!cc || cc.length < 16) {
            return res.status(400).json({ success: false, error: 'Tarjeta inv谩lida' });
        }
        const resultado = extrapolacionLogica(cc);
        res.json({ success: true, resultado });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/extrapolacion/sofia', (req, res) => {
    try {
        const { cc1, cc2 } = req.body;
        if (!cc1 || !cc2 || cc1.length < 16 || cc2.length < 16) {
            return res.status(400).json({ success: false, error: 'Tarjetas inv谩lidas' });
        }
        const resultado = extrapolacionSofia(cc1, cc2);
        res.json({ success: true, resultado });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/', (req, res) => {
    res.redirect('/chk.html');
});

app.get('/chk.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chk.html'));
});

app.get('/gen', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gen.html'));
});

app.get('/extrapolacion.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'extrapolacion.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
