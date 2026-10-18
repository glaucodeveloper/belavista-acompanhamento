import { program } from './program.js';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Elemento #app não encontrado.');
const system = program().next().value;
void system.start(root);
