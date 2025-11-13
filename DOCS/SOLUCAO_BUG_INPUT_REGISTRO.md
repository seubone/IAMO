# 🐛 Solução: Bug nos Campos de Registro

## Problema
Não é possível digitar nos campos de **Nome** e **Email** na tela de registro.

## ✅ Causa
O problema é causado por **cache do navegador** com uma versão antiga do JavaScript que tinha o bug do vídeo.

## 🔧 Solução

### Para o usuário final:

#### Opção 1: Hard Refresh (RECOMENDADO)
1. Abra a página de login: `https://simonia.seubone.com/login`
2. Pressione as teclas:
   - **Windows/Linux**: `Ctrl + Shift + R` ou `Ctrl + F5`
   - **Mac**: `Cmd + Shift + R`
3. Teste novamente

#### Opção 2: Limpar Cache Manualmente
**Google Chrome / Edge:**
1. Pressione `Ctrl + Shift + Delete` (ou `Cmd + Shift + Delete` no Mac)
2. Selecione "Período de tempo": **Tudo**
3. Marque apenas:
   - ✅ Imagens e arquivos em cache
   - ✅ Scripts e outros dados de sites
4. Clique em **Limpar dados**
5. Recarregue a página

**Firefox:**
1. Pressione `Ctrl + Shift + Delete`
2. Selecione "Intervalo de tempo para limpeza": **Tudo**
3. Marque:
   - ✅ Cache
4. Clique em **OK**
5. Recarregue a página

#### Opção 3: Modo Anônimo/Privado
1. Abra uma janela anônima:
   - **Chrome/Edge**: `Ctrl + Shift + N`
   - **Firefox**: `Ctrl + Shift + P`
2. Acesse: `https://simonia.seubone.com/login`
3. Teste o registro

---

### Para desenvolvedores:

#### O que aconteceu?
1. Havia um bug com um vídeo de fundo que bloqueava os inputs
2. O bug foi corrigido no commit `d3a4826`
3. O build foi atualizado
4. MAS o navegador dos usuários ainda usa a versão antiga em cache

#### Como forçar atualização para todos os usuários?

**1. Adicionar Versioning nos Assets (RECOMENDADO)**

Edite `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Adiciona hash único para forçar reload
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
```

**2. Adicionar Cache-Control Headers**

No servidor (nginx/apache), configure:

```nginx
# nginx
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location / {
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
}
```

**3. Service Worker (se houver)**

Se houver Service Worker, atualize a versão para forçar recarregamento.

---

## 🧪 Teste Realizado

Testei com Playwright e confirmei:
- ✅ O código está correto
- ✅ O build está atualizado
- ✅ Os campos funcionam (Playwright conseguiu digitar)
- ⚠️ Problema é cache do navegador do usuário

**Screenshot do teste:** `campo-funcionando-playwright.png`

---

## 📝 Histórico do Bug

- **Commit d3a4826**: Removido vídeo que causava o bug
- **Commit 2a1c0e6**: Renomeado arquivo de vídeo
- **Build atual**: Assets com hash `H-Z2s4cr` (novo)
- **Build antigo**: Assets com hash diferente (causava o bug)

---

## ✅ Verificação

Para confirmar que está usando a versão correta:

1. Abra DevTools (`F12`)
2. Vá na aba **Network**
3. Recarregue a página
4. Procure por arquivos `.js` em **assets/**
5. Verifique se o hash é: `H-Z2s4cr` ou similar recente
6. Se for um hash antigo, faça hard refresh

---

## 🚀 Prevenção Futura

Para evitar esse problema no futuro:

1. ✅ Vite já adiciona hash nos arquivos (implementado)
2. ✅ Configure headers de cache corretos no servidor
3. ✅ Considere adicionar versionamento de Service Worker
4. ✅ Documente aos usuários sobre hard refresh após deploys
