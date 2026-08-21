import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useUiStore } from '@/state/uiStore'

/**
 * Placeholder screen. Its only job is to prove the styling stack works:
 * Tailwind utilities apply, shadcn primitives render with their tokens, and
 * a Zustand slice drives a component.
 */
export default function App() {
  const isNavOpen = useUiStore((s) => s.isNavOpen)
  const toggleNav = useUiStore((s) => s.toggleNav)

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rhizome</h1>
        <p className="text-muted-foreground text-sm">
          A decentralized media tracker, built on AT Protocol. Early work in progress.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Styling smoke test</CardTitle>
          <CardDescription>
            Tailwind utilities, shadcn primitives, and a Zustand slice, all wired.
          </CardDescription>
          <CardAction>
            <Button variant="outline" size="sm" onClick={toggleNav}>
              {isNavOpen ? 'Close' : 'Open'}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Store value:{' '}
            <code className="font-mono">isNavOpen = {String(isNavOpen)}</code>
          </p>
        </CardContent>
        <CardFooter className="gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
        </CardFooter>
      </Card>
    </main>
  )
}
