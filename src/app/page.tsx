// Built with Claude Agent SDK
// API Test Successful!
// Testing production promotion workflow

// Homepage component - displays the main landing page with robot ASCII art and welcome message
// The ASCII art robot represents Layer Robot v1, our friendly AI assistant
// This is the main entry point for visitors to the application
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="flex flex-col items-center gap-8">
        <pre className="font-mono text-sm leading-tight text-cyan-600 dark:text-cyan-400">
{`
    ╔═══════════════════════════════╗
    ║   ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄   ║
    ║  ███████████████████████████  ║
    ║  ██╔═══╗           ╔═══╗██  ║
    ║  ██║ ● ║           ║ ● ║██  ║
    ║  ██╚═══╝           ╚═══╝██  ║
    ║  ███████████████████████████  ║
    ║  ██                       ██  ║
    ║  ██   ╔═════════════╗     ██  ║
    ║  ██   ║▓▓▓▓▓▓▓▓▓▓▓▓▓║     ██  ║
    ║  ██   ╚═════════════╝     ██  ║
    ║  ███████████████████████████  ║
    ║   ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀   ║
    ╚═══════════════════════════════╝
         ║║║║║║║║║║║║║║║
         ╚╩╩╩╩╩╩╩╩╩╩╩╩╩╝
          [  LAYER  ]
          [ ROBOT v1]
`}
        </pre>
        <h1 className="text-4xl font-bold">Welcome to the Next.js App</h1>
        <p className="text-xl text-gray-600">Powered by David</p>
      </div>
    </main>
  );
}
