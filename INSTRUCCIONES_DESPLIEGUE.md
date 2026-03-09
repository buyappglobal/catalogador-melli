# 🚀 GUÍA DE DESPLIEGUE A GITHUB PAGES

Como AI Studio borra la configuración de despliegue al sincronizar, sigue estos pasos EXACTOS cada vez que quieras publicar una nueva versión de tu app en tu web pública (buyappglobal.github.io):

## PASO 1: Sincronizar desde AI Studio
1. Haz todos los cambios que quieras en la app aquí en AI Studio.
2. Cuando estés contento con el resultado, dale al botón de la nube **"Sync to GitHub"** (arriba a la derecha).
3. Esto enviará tu código a GitHub, pero borrará el archivo que hace que la web se publique.

## PASO 2: Restaurar el archivo de despliegue en GitHub
1. Ve a tu repositorio en GitHub: https://github.com/buyappglobal/catalogador-melli
2. Ve a la pestaña **Settings** (Ajustes) > **Pages** (Páginas) en el menú izquierdo.
3. En "Build and deployment", asegúrate de que "Source" está en **GitHub Actions**.
4. Haz clic en el enlace **"create your own"** o "set up a workflow yourself".
5. En la caja de texto "Name your file...", escribe exactamente: `deploy.yml`
6. Borra todo el código que haya en el editor grande y pega este código exacto:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.VITE_GEMINI_API_KEY }}
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

7. Haz clic en el botón verde **"Commit changes..."** (arriba a la derecha).
8. Deja marcada la opción **"Commit directly to the main branch"** y dale al botón verde de confirmar.

## PASO 3: Esperar y Comprobar
1. Ve a la pestaña **Actions** (Comportamiento) arriba en GitHub.
2. Verás un proceso en marcha (círculo amarillo).
3. Espera 1 o 2 minutos hasta que se ponga en verde ✅.
4. ¡Listo! Ve a tu web (https://buyappglobal.github.io/catalogador-melli/) y pulsa `Ctrl + F5` para ver los cambios.
