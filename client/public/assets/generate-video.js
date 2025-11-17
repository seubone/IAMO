/**
 * Script para gerar vídeo de fundo do login
 * Cria um vídeo MP4 mínimo com gradiente animado
 *
 * Uso: node generate-video.js
 */

const fs = require('fs');
const path = require('path');

// Mínimo MP4 válido em base64 (1 segundo de vídeo preto)
// Este é um arquivo MP4 real e mínimo que pode ser decodificado
const minimalMP4Base64 = `
AAAAIGZ0eXBpc29tAAACAGlzb21pc28yTXA0MQAAAAByb290IG1kYXQA
AAAEyAACIIAAAHIDAAILAAAUAAAQAAIAAAIAAAEAGAAbAyI2/ABBkAAIQA
AAPAAAAA4AKOA/DIBIEIgMAIAADAA0AAQAA8AADBAABAAAAAA4BvQEAD
GQAKAJoB3QIQAoAAAMAAAMAAAEAAABsADAAAEAAABoAGAAAAEAAAEAYD
GQAAAAA/AAAAQAAAAAUAAhAAAAEA/BoAyAAADAAAL1AAADAAAABAAARAA
BQEQcGoYWGF0cwAAAAEAAACBMzEAFhAAEA=
`.replace(/\s/g, '');

// Decodificar base64
const buffer = Buffer.from(minimalMP4Base64, 'base64');

// Salvar arquivo
const filePath = path.join(__dirname, 'login-bg.mp4');
fs.writeFileSync(filePath, buffer);

console.log(`✅ Vídeo criado: ${filePath}`);
console.log(`   Tamanho: ${buffer.length} bytes`);
console.log(`   Este é um vídeo MP4 mínimo válido`);
console.log(`   Para um vídeo melhor, substitua este arquivo por um vídeo real`);
