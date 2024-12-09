import { DarkThemeToggle } from 'flowbite-react';

function Header() {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-3xl font-bold">SpotDL Frontend</h1>
      <DarkThemeToggle />
    </div>
  );
}

export default Header;
