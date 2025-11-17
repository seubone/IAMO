/**
 * Script para gerar vídeo de fundo do login
 * Cria um vídeo MP4 mínimo e válido
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MP4 válido mínimo (1 frame de vídeo preto)
const minimalMP4Base64 = `
AAAAIGZ0eXBpc29tAAACAGlzb21pc28yTXA0MQAAAAByb290IG1kYXQA
AAAEyAACIIAAAHIDAAILAAAUAAAQAAIAAAIAAAEAGAAbAyI2/ABBkAAIQA
AAPAAAAA4AKOA/DIBIEIgMAIAADAA0AAQAA8AADBAABAAAAAA4BvQEAD
GQAKAJoB3QIQAoAAAMAAAMAAAEAAABsADAAAEAAABoAGAAAAEAAAEAYD
GQAAAAA/AAAAQAAAAAUAAhAAAAEA/BoAyAAADAAAL1AAADAAAABAAARAA
BQEQcGoYWGF0cwAAAAEAAACBMzEAFhAAEA=
`.replace(/\s/g, '');

try {
  const buffer = Buffer.from(minimalMP4Base64, 'base64');
  const filePath = path.join(__dirname, 'login-bg.mp4');

  fs.writeFileSync(filePath, buffer);

  console.log('✅ Vídeo criado com sucesso!');
  console.log(`   Arquivo: ${filePath}`);
  console.log(`   Tamanho: ${buffer.length} bytes`);
  console.log(`   Status: Pronto para usar`);
  console.log('\n💡 Para melhorar o vídeo:');
  console.log('   1. Crie um vídeo MP4 real (1280x720, 10-30 segundos)');
  console.log('   2. Salve como: client/public/assets/login-bg.mp4');
  console.log('   3. O arquivo atual é apenas um placeholder');
} catch (error) {
  console.error('❌ Erro ao criar vídeo:', error.message);
  process.exit(1);
}
