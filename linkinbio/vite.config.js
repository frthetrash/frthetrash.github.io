// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replace 'linkspark' with your actual GitHub repository name if different
const repoName = 'linkspark'; 

export default defineConfig({
  // **CRITICAL FOR GITHUB PAGES SUBDIRECTORY DEPLOYMENT**
  base: `/${repoName}/`, 
  
  plugins: [react()],
  
  // Configure PostCSS for Tailwind CSS
  css: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  
  // Optional: Adjust the build output directory if needed, 'dist' is default
  build: {
    outDir: 'dist',
  }
});
