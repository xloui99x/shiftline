import { mountApp } from './app';
import './styles.css';

const root = document.getElementById('app');
if (!root) throw new Error('Root element #app not found');
mountApp(root);
