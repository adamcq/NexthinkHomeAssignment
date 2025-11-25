interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-base text-gray-500">{subtitle}</p>}
      </div>
    </header>
  );
}
