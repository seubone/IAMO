import { ThemeToggle } from '../ThemeToggle';
import { ThemeProvider } from '../ThemeProvider';

export default function ThemeToggleExample() {
  return (
    <ThemeProvider>
      <div className="flex items-center justify-center p-8">
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
}
