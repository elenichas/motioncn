
/**
 * Shimmering text. The real text stays in a readable colour (muted-foreground);
 * an aria-hidden copy in the foreground colour is revealed by a moving mask,
 * so contrast checks see accessible colours and screen readers read it once.
 */
export function Shimmer({ children, active, fast }: { children: string; active: boolean; fast?: boolean }) {
  return (
    <span className="relative inline-block">
      <span className="text-muted-foreground">{children}</span>
      {active && (
        <span aria-hidden className="shimmer-mask text-foreground absolute inset-0" style={{ "--shimmer-duration": fast ? "0.9s" : "1.6s" } as React.CSSProperties}>
          {children}
        </span>
      )}
    </span>
  )
}
