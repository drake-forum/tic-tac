import '../styles/globals.css'
import type { AppProps } from 'next/app'
import React from "react";

export default function App({ Component, pageProps }: AppProps) {
  return (
      <div className="App">
        <div className="authed-container">
          <div className="header-container">
              <Component {...pageProps} />
          </div>
        </div>
      </div>
  )
}
