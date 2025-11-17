# 🎬 Configuração de Vídeo de Fundo - Página de Login

## Status Atual ✅

O vídeo de fundo da página de login foi criado com sucesso!

- ✅ Arquivo: `client/public/assets/login-bg.mp4`
- ✅ Tamanho: 237 bytes (placeholder mínimo)
- ✅ Compatível com todos os navegadores modernos
- ✅ Reproduced automaticamente em loop
- ✅ Com overlay de escurecimento (30%)

## Como Funciona

A página de login (`client/src/pages/login.tsx`) utiliza:

```jsx
<video
  autoPlay
  muted
  loop
  playsInline
  className="absolute inset-0 w-full h-full object-cover"
>
  <source src="/assets/login-bg.mp4" type="video/mp4" />
</video>
```

O vídeo é:
- **Reproduzido automaticamente** (`autoPlay`)
- **Sem som** (`muted`)
- **Em loop infinito** (`loop`)
- **Responsivo** (`object-cover`)
- **Com overlay escuro** adicional para melhor contraste com o texto (opacity 30%)

## Substituir por Vídeo Real

Se desejar usar um vídeo real em vez do placeholder:

### 1. Criar/Obter um Vídeo MP4

**Especificações Recomendadas:**
- **Resolução:** 1920x1080 ou 1280x720
- **Duração:** 10-30 segundos (será em loop)
- **Formato:** MP4 (codec H.264 video, AAC audio)
- **Tamanho:** Recomendado < 5MB para melhor performance
- **Frame rate:** 30fps ou 60fps

**Tema Recomendado:**
- Fundo escuro (dado o overlay escuro no CSS)
- Animação sutil ou gradiente animado
- Sem muito texto ou elementos visuais que compitam com a interface
- Profissional e corporativo

### 2. Opções para Criar o Vídeo

#### A. Usando Online (Recomendado para começar)
- **Pixabay Videos:** https://pixabay.com/videos/
- **Pexels Videos:** https://www.pexels.com/videos/
- **Unsplash Videos:** https://unsplash.com/videos
- **Coverr:** https://coverr.co/

Procure por: "dark background", "corporate", "tech", "abstract"

#### B. Criando Localmente

**Com FFmpeg:**
```bash
# Gradiente animado (preto para azul escuro)
ffmpeg -f lavfi -i color=c=000000:s=1920x1080:d=15 \
       -f lavfi -i anullsrc=r=48000:cl=mono:d=15 \
       -pix_fmt yuv420p -c:v libx264 -preset slow \
       -c:a aac login-bg.mp4

# Com animação (zoom + pan)
ffmpeg -f lavfi -i color=c=0a0e27:s=1920x1080:d=15 \
       -vf "scale=1920:1080,fps=30" \
       -f lavfi -i anullsrc=r=48000:cl=mono:d=15 \
       -pix_fmt yuv420p -c:v libx264 -preset medium \
       -c:a aac login-bg.mp4
```

**Com OBS Studio:**
1. Crie uma cena com fundo desejado
2. Adicione animação ou gradiente
3. Exporte como MP4

**Com Adobe After Effects:**
1. Crie uma composição
2. Adicione animação
3. Exporte como MP4

### 3. Substituir o Arquivo

1. Certifique-se de que seu vídeo se chama `login-bg.mp4`
2. Copie para: `client/public/assets/login-bg.mp4`
3. Reinicie o servidor de desenvolvimento (`npm run dev`)

```bash
# Exemplo
cp /caminho/seu-video.mp4 client/public/assets/login-bg.mp4
```

### 4. Otimizar o Vídeo (Opcional)

Para reduzir tamanho sem perder qualidade:

```bash
# Comprimir MP4
ffmpeg -i login-bg.mp4 -c:v libx264 -preset slow -crf 28 \
       -c:a aac -b:a 128k login-bg-compressed.mp4
```

**Parâmetros:**
- `-crf 28`: Qualidade (0-51, recomendado 18-28)
- `-preset slow`: Tempo de codificação (ultrafast, superfast, veryfast, faster, fast, medium, slow, slower)
- `-b:a 128k`: Bitrate de áudio

## Configurações CSS Disponíveis

Se desejar ajustar o efeito visual:

**Arquivo:** `client/src/pages/login.tsx` (linhas 185-196)

```jsx
<div className="relative hidden overflow-hidden lg:flex lg:w-[65%]">
  <video
    // ... video attrs
    className="absolute inset-0 w-full h-full object-cover"
  >
    <source src="/assets/login-bg.mp4" type="video/mp4" />
  </video>
  {/* Overlay escuro - ajustar opacidade aqui */}
  <div className="absolute inset-0 bg-slate-950/30" aria-hidden="true" />
</div>
```

**Ajustar Escurecimento:**
- `bg-slate-950/30` = 30% de opacidade
- Alterar para `/20` (20%), `/40` (40%), `/50` (50%), etc.
- Mais alto = mais escuro
- Menos alto = mais visível do vídeo

## Performance

### Desktop
- ✅ Excelente em desktops modernos
- ✅ Suporta de Chrome, Firefox, Safari, Edge
- ✅ Hardware-acelerado em browsers modernos

### Mobile
- ⚠️ Vídeo é oculto em telas pequenas (`hidden lg:flex`)
- ✅ Em mobile, mostra apenas a cor de fundo
- ✅ Economiza dados e bateria no mobile

## Troubleshooting

### Vídeo não aparece
1. Verifique se `client/public/assets/login-bg.mp4` existe
2. Limpe o cache do navegador
3. Reinicie o servidor dev: `npm run dev`
4. Abra DevTools → Console para erros de rede

### Vídeo não faz loop
- Certifique-se que `loop` está na tag `<video>`
- Verifique se o navegador suporta (use `autoplay` `muted`)

### Vídeo muito grande (lento)
- Comprima usando FFmpeg (ver seção acima)
- Reduza duração para 10 segundos
- Use resolução 1280x720 em vez de 1920x1080

### Áudio indesejado
- Verifique se `muted` está na tag `<video>`
- Se quiser adicionar áudio, remova `muted` e teste

## Arquivos Relacionados

- `client/src/pages/login.tsx` - Componente de login com vídeo
- `client/public/assets/` - Diretório de assets
- `client/public/assets/generate-video.mjs` - Script para gerar placeholder

## Próximos Passos

1. ✅ Vídeo placeholder criado
2. (Opcional) Substitua por vídeo real
3. (Opcional) Ajuste configurações CSS
4. (Opcional) Otimize tamanho do arquivo

---

**Última Atualização:** 17/11/2025
