import { Inter, Plus_Jakarta_Sans, Mulish, Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});
const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-display",
    display: "swap",
    weight: ["400", "500", "600", "700", "800"],
});
const mulish = Mulish({
    subsets: ["latin"],
    variable: "--font-landing-display",
    display: "swap",
    weight: ["400", "500", "600", "700", "800"],
});
const nunito = Nunito({
    subsets: ["latin"],
    variable: "--font-landing-body",
    display: "swap",
    weight: ["400", "500", "600", "700"],
});
export const metadata = {
    title: "ResumeAI — Match your resume to the job",
    description: "Paste a job description. ResumeAI ranks your resumes by fit, then helps you tailor the best one and track the application.",
    icons: {
        icon: "/favicon.png",
    },
};
export default function RootLayout({ children, }) {
    return (<html lang="en" className={`${inter.variable} ${plusJakartaSans.variable} ${mulish.variable} ${nunito.variable}`}>
      <head>
        {/* Dark mode removed (light-only app): strip any stale `dark` class
            before paint, e.g. from a previous session's DOM. */}
        <script dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.remove('dark');try{localStorage.removeItem('theme')}catch(e){}`,
        }}/>
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>);
}
