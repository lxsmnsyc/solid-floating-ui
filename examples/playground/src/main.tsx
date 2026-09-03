import { render } from 'solid-js/web';
import App from './App';
import './styles.css';

const root = document.querySelector('#root');

if (!root) {
  throw new Error('Missing #root element');
}

render(() => <App />, root);
