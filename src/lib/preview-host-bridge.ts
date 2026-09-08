export type PreviewHostBridgeOptions = {
  navigate?: (path: string) => void;
  getRoutePaths?: () => string[];
};

export function installPreviewHostBridge(_options: PreviewHostBridgeOptions = {}): () => void {
  return () => {};
}

export function collectRoutePathsFromTree(routeTree: unknown): string[] {
  const paths = new Set<string>();
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as { fullPath?: unknown; path?: unknown; children?: unknown };
    const full =
      typeof record.fullPath === "string"
        ? record.fullPath
        : typeof record.path === "string"
          ? record.path
          : null;
    if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
    else if (full === "") paths.add("/");
    const children = record.children;
    if (Array.isArray(children)) for (const child of children) walk(child);
    else if (children && typeof children === "object") {
      for (const child of Object.values(children as Record<string, unknown>)) walk(child);
    }
  };
  walk(routeTree);
  return [...paths];
}
