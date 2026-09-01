export function AppErrorComponent({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-6 text-fg">
      <p className="max-w-md text-sm text-muted">{message}</p>
    </div>
  );
}
