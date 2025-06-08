// app.js

/**
 * Hàm tính toán checksum theo Thuật toán Luhn.
 * @param {string} numberString - Chuỗi số thẻ chưa có chữ số cuối cùng.
 * @returns {number} - Chữ số kiểm tra (check digit).
 */
function calculateLuhn(numberString) {
    let sum = 0;
    let isSecond = true;
    for (let i = numberString.length - 1; i >= 0; i--) {
        let digit = parseInt(numberString.charAt(i), 10);
        if (isSecond) {
            digit = digit * 2;
            if (digit > 9) {
                digit = digit - 9;
            }
        }
        sum += digit;
        isSecond = !isSecond;
    }
    return (10 - (sum % 10)) % 10;
}

/**
 * Sinh một số thẻ đầy đủ
 */
function generateFullCardDetails(bin, month, year, cvv) {
    // --- 1. Tạo số thẻ ---
    const cardNumberLength = 16;
    let cardNumber = bin;
    const randomDigitsLength = cardNumberLength - bin.length - 1;
    for (let i = 0; i < randomDigitsLength; i++) {
        cardNumber += Math.floor(Math.random() * 10);
    }
    const checkDigit = calculateLuhn(cardNumber);
    cardNumber += checkDigit;
    return { cardNumber, month, year, cvv };
}

function randomMonth() {
    return String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
}
function randomYear() {
    const now = new Date();
    return String(now.getFullYear() + Math.floor(Math.random() * 8));
}
function randomCVV() {
    return String(Math.floor(Math.random() * 900) + 100);
}

function formatOutput(cards, format) {
    switch (format) {
        case 'pipe':
            return cards.map(c => `${c.cardNumber}|${c.month.toString().padStart(2, '0')}|${c.year.toString().padStart(4, '0')}|${c.cvv.toString().padStart(3, '0')}`).join('\n');
        case 'csv':
            return 'Card Number,Month,Year,CVV\n' + cards.map(c => `${c.cardNumber},${c.month},${c.year},${c.cvv}`).join('\n');
        case 'xml':
            return (
                '<cards>\n' +
                cards.map(c => `  <card>\n    <number>${c.cardNumber}</number>\n    <month>${c.month}</month>\n    <year>${c.year}</year>\n    <cvv>${c.cvv}</cvv>\n  </card>`).join('\n') +
                '\n</cards>'
            );
        case 'json':
            return JSON.stringify(cards, null, 2);
        case 'sql':
            return (
                'INSERT INTO cards (number, month, year, cvv) VALUES\n' +
                cards.map(c => `('${c.cardNumber}', '${c.month}', '${c.year}', '${c.cvv}')`).join(',\n') + ';'
            );
        default:
            return cards.map(c => `${c.cardNumber}|${c.month}|${c.year}|${c.cvv}`).join('\n');
    }
}

// Sự kiện click nút Generate

// DOM elements
const binInput = document.getElementById('bin');
const dateCheck = document.getElementById('dateCheck');
const monthSelect = document.getElementById('month');
const yearSelect = document.getElementById('year');
const cvvCheck = document.getElementById('cvvCheck');
const cvvInput = document.getElementById('cvv');
const quantityInput = document.getElementById('quantity');
const formatSelect = document.getElementById('format');
const resultsArea = document.getElementById('results');
const generateBtn = document.getElementById('generateBtn');
const customYearInput = document.getElementById('customYear');

function showSpinner() {
    document.getElementById('spinner-overlay').style.display = 'flex';
}
function hideSpinner() {
    document.getElementById('spinner-overlay').style.display = 'none';
}

generateBtn.addEventListener('click', () => {
    showSpinner();
    setTimeout(() => { // Đảm bảo spinner hiển thị rõ ràng khi gen nhanh
        const bin = binInput.value.trim();
        const quantity = parseInt(quantityInput.value, 10);
        const format = formatSelect.value;

        // Validate BIN
        if (!bin || bin.length < 6 || bin.length > 16 || !/^\d+$/.test(bin)) {
            resultsArea.value = 'BIN không hợp lệ. Vui lòng nhập từ 6 đến 16 chữ số.';
            hideSpinner();
            return;
        }

        // Xử lý ngày hết hạn
        let month = '', year = '';
        if (dateCheck.checked) {
            month = monthSelect.value === 'random' ? randomMonth() : monthSelect.value;
            if (yearSelect.value === 'random') {
                year = randomYear();
            } else {
                year = yearSelect.value;
            }
        } else {
            month = randomMonth();
            year = randomYear();
        }

        // Xử lý CVV
        let cvv = '';
        if (cvvCheck.checked) {
            cvv = cvvInput.value.trim() ? cvvInput.value.trim() : randomCVV();
        } else {
            cvv = randomCVV();
        }

        // Sinh danh sách thẻ
        let cards = [];
        for (let i = 0; i < quantity; i++) {
            let m = month, y = year, v = cvv;
            if (monthSelect.value === 'random' || !dateCheck.checked) m = randomMonth();
            if (yearSelect.value === 'random' || !dateCheck.checked) y = randomYear();
            else if (dateCheck.checked) y = yearSelect.value;
            if (!cvvInput.value.trim() || !cvvCheck.checked) v = randomCVV();
            cards.push(generateFullCardDetails(bin, m, y, v));
        }

        // Xuất kết quả
        resultsArea.value = formatOutput(cards, format);
        hideSpinner();
    }, 200);
});

// Thêm sự kiện cho nút Check
const checkBtn = document.getElementById('checkBtn');
checkBtn.addEventListener('click', async () => {
    showSpinner();
    const lines = resultsArea.value.trim().split('\n').filter(line => line);
    if (lines.length === 0) { hideSpinner(); return; }
    resultsArea.value = 'Checking...';
    let checkedResults = [];
    for (let i = 0; i < lines.length; i++) {
        const data = lines[i];
        try {
            const res = await fetch('https://api.chkr.cc/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            });
            const result = await res.json();
            let status = '';
            if (result.status === 'Live') status = '✅ Live';
            else if (result.status === 'Die') status = '❌ Die';
            else status = '❓ Unknown';
            checkedResults.push({ line: `${data}   [${status}]`, status });
        } catch (e) {
            checkedResults.push({ line: `${data}   [Error]`, status: 'Error' });
        }
        // Hiển thị tiến trình tạm thời
        const live = checkedResults.filter(r => r.status === '✅ Live');
        const other = checkedResults.filter(r => r.status !== '✅ Live');
        resultsArea.value = [...live, ...other].map(r => r.line).join('\n');
    }
    // Sắp xếp lại: Live lên đầu
    const live = checkedResults.filter(r => r.status === '✅ Live');
    const other = checkedResults.filter(r => r.status !== '✅ Live');
    resultsArea.value = [...live, ...other].map(r => r.line).join('\n');
    hideSpinner();
});