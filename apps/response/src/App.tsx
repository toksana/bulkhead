import type { ReactElement } from 'react';

import styles from './App.module.css';

export default function App(): ReactElement {
  return (
    <section className={styles.panel} aria-label="Response">
      <h2>Response</h2>
    </section>
  );
}
