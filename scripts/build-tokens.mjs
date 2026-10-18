import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../packages/design-tokens/', import.meta.url);
const { tokens, textStyles, shadows } = JSON.parse(await readFile(new URL('tokens.json', root)));
const variableName = (token) => {
  const match = token.web?.match(/^var\((--[a-z0-9-]+)\)$/);
  if (!match) throw new Error(`Code Syntax WEB inválido: ${JSON.stringify(token)}`);
  return match[1];
};
const resolve = (name, trail = []) => {
  if (!tokens[name]) throw new Error(`Alias inexistente: ${name}`);
  if (trail.includes(name)) throw new Error(`Alias circular: ${[...trail, name].join(' → ')}`);
  const token = tokens[name];
  return token.alias ? resolve(token.alias, [...trail, name]) : token.value;
};
const value = (name, token) => {
  if (token.alias) {
    const resolved = resolve(name);
    if (token.resolved !== resolved) throw new Error(`Alias desactualizado: ${name}`);
    return `var(${variableName(tokens[token.alias])})`;
  }
  if (token.type === 'STRING') return JSON.stringify(token.value);
  if (token.type === 'COLOR') {
    if (typeof token.value === 'string') return token.value;
    return `rgb(${parseInt(token.value.hex.slice(1, 3), 16)} ${parseInt(token.value.hex.slice(3, 5), 16)} ${parseInt(token.value.hex.slice(5, 7), 16)} / ${token.value.alpha})`;
  }
  const unitless =
    name.includes('/weight/') || name.endsWith('/weight') || name === 'layout/grid-columns';
  return `${token.value}${unitless ? '' : 'px'}`;
};

const declarations = Object.entries(tokens).map(
  ([name, token]) => `  ${variableName(token)}: ${value(name, token)};`,
);
for (const [name, shadow] of Object.entries(shadows)) {
  declarations.push(
    `  --hf-${name.replaceAll('/', '-')}: ${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.spread}px rgb(16 11 24 / ${shadow.opacity});`,
  );
}
const typography = Object.entries(textStyles).map(([name, style]) => {
  const bound = (property) => `var(${variableName(tokens[style.bindings[property]])})`;
  return `.${name.replace('type/', 'hf-type-')} {\n  font-family: ${bound('fontFamily')}, sans-serif;\n  font-size: ${bound('fontSize')};\n  line-height: ${bound('lineHeight')};\n  font-weight: ${bound('fontWeight')};\n  letter-spacing: ${bound('letterSpacing')};\n}`;
});
const css = `/* Generado desde tokens.json. Editar la fuente y ejecutar npm run tokens:build. */\n:root {\n${declarations.join('\n')}\n}\n\n${typography.join('\n\n')}\n`;
const target = new URL('tokens.css', root);
if (process.argv.includes('--check')) {
  if ((await readFile(target, 'utf8')) !== css) throw new Error('tokens.css no está actualizado');
  console.log(`${Object.keys(tokens).length} tokens y ${typography.length} estilos verificados.`);
} else {
  await writeFile(target, css);
  console.log(`${Object.keys(tokens).length} tokens y ${typography.length} estilos generados.`);
}
