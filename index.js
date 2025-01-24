const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// Función de validación Luhn
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

// Función para obtener el tipo de tarjeta
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
                
                // Verificación más detallada del status
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chk.html'));
});

app.get('/gen', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'gen.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
