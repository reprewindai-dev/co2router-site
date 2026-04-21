import type { AppProps } from 'next/app'
import { Space_Grotesk } from 'next/font/google'
import '../app/globals.css'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] })

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={spaceGrotesk.className}>
      <Component {...pageProps} />
    </div>
  )
}
