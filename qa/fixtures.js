/* Synthetic repository, never packaged. No real credentials. */
globalThis.rrFixture = {
  head:'a49d85e211029f2f055bafbc5adb9fdff34451b8',tree:'b'.repeat(40),
  files:{
    'package.json':JSON.stringify({name:'launchpad-web',private:true,engines:{node:'>=22'},packageManager:'pnpm@10.14.0',scripts:{dev:'vite --host',build:'tsc --noEmit && vite build',preview:'vite preview',test:'node --test'},devDependencies:{vite:'^6.0.0',typescript:'^5.0.0'}},null,2),
    '.nvmrc':'22\n',
    '.env.example':'API_BASE_URL=https://example.invalid\nAPI_KEY=fixture_value_do_not_show\n',
    'README.md':'# Launchpad\n\nLocal development:\n\n```sh\npnpm install\npnpm run dev\n```\n',
    'Dockerfile':'FROM node:22-alpine AS build\nWORKDIR /app\n',
    'pnpm-lock.yaml':'lockfileVersion: 9',
    'vite.config.ts':'throw new Error("Never execute this fixture");',
    'index.html':'<main>Hello</main>',
    '.env':'TOP_SECRET=fixture_private_value'
  }
};
